#!/usr/bin/env python3
"""
Fetch Austin 311 service request data and count by service request type.
Supports filtering by year and processes data in chunks for large datasets.
"""

import argparse
import sys
from collections import Counter

import requests

BASE_URL = "https://data.austintexas.gov/resource/xwdj-i9he.json"


def fetch_counts_by_topic(year=None, zip_code=None):
    """Fetch pre-aggregated topic counts via a single server-side GROUP BY query."""
    params = {
        "$select": "sr_type_desc, count(*) as count",
        "$group": "sr_type_desc",
        "$limit": 50000,  # well above the number of unique service types
    }
    where_parts = []
    if year:
        where_parts.append(f"sr_created_date >= '{year}-01-01' AND sr_created_date < '{year + 1}-01-01'")
    if zip_code:
        where_parts.append(f"sr_location_zip_code = '{zip_code}'")
    if where_parts:
        params["$where"] = " AND ".join(where_parts)

    print("Fetching aggregated topic counts...", file=sys.stderr)
    response = requests.get(BASE_URL, params=params, timeout=60)
    response.raise_for_status()
    rows = response.json()
    print(f"Retrieved {len(rows)} unique service types.", file=sys.stderr)

    counter = Counter()
    for row in rows:
        topic = row.get("sr_type_desc") or "Unknown"
        counter[topic] = int(row["count"])
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
    parser.add_argument(
        "--zip",
        help="Filter by zip code (e.g., 78701)",
    )
    args = parser.parse_args()

    if args.year and args.zip:
        print(f"Fetching 311 data for year {args.year}, zip code {args.zip}...", file=sys.stderr)
    elif args.year:
        print(f"Fetching 311 data for year {args.year}...", file=sys.stderr)
    elif args.zip:
        print(f"Fetching 311 data for zip code {args.zip}...", file=sys.stderr)
    else:
        print("Fetching all 311 data...", file=sys.stderr)

    counter = fetch_counts_by_topic(args.year, args.zip)
    print_results(counter)


if __name__ == "__main__":
    main()
