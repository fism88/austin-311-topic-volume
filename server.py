#!/usr/bin/env python3
"""
Flask API server for Austin 311 service request data.
"""

import time
from collections import Counter

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_URL = "https://data.austintexas.gov/resource/xwdj-i9he.json"
BATCH_SIZE = 10000
MAX_RETRIES = 3
RETRY_DELAY = 2


def fetch_batch(offset, year=None):
    """Fetch a batch of records from the API."""
    params = {
        "$limit": BATCH_SIZE,
        "$offset": offset,
        "$order": ":id",
    }

    if year:
        params["$where"] = f"sr_created_date >= '{year}-01-01' AND sr_created_date < '{year + 1}-01-01'"

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(BASE_URL, params=params, timeout=60)

            if response.status_code == 429:
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                raise

    return []


def fetch_all_records(year=None):
    """Generator that yields records in batches."""
    offset = 0

    while True:
        batch = fetch_batch(offset, year)

        if not batch:
            break

        yield from batch

        if len(batch) < BATCH_SIZE:
            break

        offset += BATCH_SIZE


def count_by_topic(records):
    """Count records by sr_type_desc field."""
    counter = Counter()

    for record in records:
        topic = record.get("sr_type_desc", "Unknown")
        if topic is None:
            topic = "Unknown"
        counter[topic] += 1

    return counter


@app.route("/api/counts", methods=["GET"])
def get_counts():
    """Get service request counts, optionally filtered by year."""
    year_param = request.args.get("year")
    year = int(year_param) if year_param else None

    try:
        records = fetch_all_records(year)
        counter = count_by_topic(records)

        counts = [
            {"type": topic, "count": count}
            for topic, count in counter.most_common()
        ]

        return jsonify({
            "year": year,
            "total": sum(counter.values()),
            "unique_types": len(counter),
            "counts": counts,
        })

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
