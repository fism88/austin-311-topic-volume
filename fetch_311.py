#!/usr/bin/env python3
"""
Fetch Austin 311 service request data and count by service request type.
Supports filtering by year and processes data in chunks for large datasets.
"""

import argparse
import os
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from dotenv import load_dotenv

BASE_URL = "https://data.austintexas.gov/resource/xwdj-i9he.json"
BATCH_SIZE = 10000
MAX_RETRIES = 3
RETRY_DELAY = 2
MAX_WORKERS = 8


def load_api_key():
    """Load API key from .env file (optional for public datasets)."""
    load_dotenv()
    api_key = os.getenv("API_KEY")
    if not api_key:
        print("Warning: API_KEY not found in .env file. Using public access.", file=sys.stderr)
    return api_key


def build_params(offset, year=None):
    """Build query params for a batch request."""
    params = {
        "$select": "sr_type_desc",
        "$limit": BATCH_SIZE,
        "$offset": offset,
        "$order": ":id",
    }
    if year:
        params["$where"] = f"sr_created_date >= '{year}-01-01' AND sr_created_date < '{year + 1}-01-01'"
    return params


def fetch_batch(session, offset, year=None):
    """Fetch a batch of records from the API."""
    params = build_params(offset, year)

    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(BASE_URL, params=params, timeout=60)

            if response.status_code == 429:
                wait_time = RETRY_DELAY * (attempt + 1)
                print(f"Rate limited. Waiting {wait_time}s...", file=sys.stderr)
                time.sleep(wait_time)
                continue

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                wait_time = RETRY_DELAY * (attempt + 1)
                print(f"Request failed: {e}. Retrying in {wait_time}s...", file=sys.stderr)
                time.sleep(wait_time)
            else:
                raise

    return []


def get_total_count(session, year=None):
    """Get total record count via $select=count(*)."""
    params = {"$select": "count(*)", "$limit": 1}
    if year:
        params["$where"] = f"sr_created_date >= '{year}-01-01' AND sr_created_date < '{year + 1}-01-01'"
    response = session.get(BASE_URL, params=params, timeout=60)
    response.raise_for_status()
    return int(response.json()[0]["count"])


def fetch_all_records(api_key, year=None):
    """Fetch all records in parallel batches."""
    with requests.Session() as session:
        total = get_total_count(session, year)
        print(f"Total records to fetch: {total}", file=sys.stderr)

        offsets = range(0, total, BATCH_SIZE)
        all_records = []

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(fetch_batch, session, offset, year): offset for offset in offsets}
            completed = 0
            for future in as_completed(futures):
                batch = future.result()
                all_records.extend(batch)
                completed += 1
                print(f"Fetched batch {completed}/{len(futures)} ({len(all_records)} records so far)...", file=sys.stderr)

    print(f"Total records fetched: {len(all_records)}", file=sys.stderr)
    return all_records


def count_by_topic(records):
    """Count records by sr_type_desc field."""
    counter = Counter()

    for record in records:
        topic = record.get("sr_type_desc", "Unknown")
        if topic is None:
            topic = "Unknown"
        counter[topic] += 1

    return counter


def print_results(counter):
    """Print results sorted by count descending."""
    print("\n" + "=" * 60)
    print(f"{'COUNT':>8} | SERVICE REQUEST TYPE")
    print("=" * 60)

    for topic, count in counter.most_common():
        print(f"{count:>8} | {topic}")

    print("=" * 60)
    print(f"{'TOTAL':>8} | {sum(counter.values())} records, {len(counter)} unique types")


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Austin 311 data and count by service request type"
    )
    parser.add_argument(
        "--year",
        type=int,
        help="Filter by year (e.g., 2024)",
    )
    args = parser.parse_args()

    api_key = load_api_key()

    if args.year:
        print(f"Fetching 311 data for year {args.year}...", file=sys.stderr)
    else:
        print("Fetching all 311 data...", file=sys.stderr)

    records = fetch_all_records(api_key, args.year)  # api_key unused but kept for future auth
    counter = count_by_topic(records)
    print_results(counter)


if __name__ == "__main__":
    main()
