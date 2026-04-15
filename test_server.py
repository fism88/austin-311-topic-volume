"""Unit tests for the Flask API server."""

import pytest
import responses
from server import app, fetch_batch, count_by_topic, BASE_URL


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_returns_ok(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json == {"status": "ok"}


class TestCountByTopic:
    """Tests for the count_by_topic function."""

    def test_counts_single_topic(self):
        records = [
            {"sr_type_desc": "Pothole"},
            {"sr_type_desc": "Pothole"},
            {"sr_type_desc": "Pothole"},
        ]
        result = count_by_topic(iter(records))
        assert result["Pothole"] == 3

    def test_counts_multiple_topics(self):
        records = [
            {"sr_type_desc": "Pothole"},
            {"sr_type_desc": "Graffiti"},
            {"sr_type_desc": "Pothole"},
            {"sr_type_desc": "Noise"},
        ]
        result = count_by_topic(iter(records))
        assert result["Pothole"] == 2
        assert result["Graffiti"] == 1
        assert result["Noise"] == 1

    def test_handles_missing_field(self):
        records = [
            {"sr_type_desc": "Pothole"},
            {"other_field": "value"},
            {"sr_type_desc": None},
        ]
        result = count_by_topic(iter(records))
        assert result["Pothole"] == 1
        assert result["Unknown"] == 2

    def test_empty_records(self):
        result = count_by_topic(iter([]))
        assert len(result) == 0


class TestFetchBatch:
    """Tests for the fetch_batch function."""

    @responses.activate
    def test_fetch_batch_success(self):
        mock_data = [
            {"sr_type_desc": "Pothole", "sr_number": "1"},
            {"sr_type_desc": "Graffiti", "sr_number": "2"},
        ]
        responses.add(
            responses.GET,
            BASE_URL,
            json=mock_data,
            status=200,
        )

        result = fetch_batch(offset=0)
        assert result == mock_data

    @responses.activate
    def test_fetch_batch_with_year_filter(self):
        mock_data = [{"sr_type_desc": "Pothole"}]
        responses.add(
            responses.GET,
            BASE_URL,
            json=mock_data,
            status=200,
        )

        result = fetch_batch(offset=0, year=2024)
        assert result == mock_data

        # Verify the year filter was applied
        request = responses.calls[0].request
        assert "2024-01-01" in request.url
        assert "2025-01-01" in request.url

    @responses.activate
    def test_fetch_batch_empty_response(self):
        responses.add(
            responses.GET,
            BASE_URL,
            json=[],
            status=200,
        )

        result = fetch_batch(offset=0)
        assert result == []


class TestCountsEndpoint:
    """Tests for the /api/counts endpoint."""

    @responses.activate
    def test_counts_endpoint_success(self, client):
        mock_data = [
            {"sr_type_desc": "Pothole"},
            {"sr_type_desc": "Pothole"},
            {"sr_type_desc": "Graffiti"},
        ]
        responses.add(
            responses.GET,
            BASE_URL,
            json=mock_data,
            status=200,
        )

        response = client.get("/api/counts?year=2024")

        assert response.status_code == 200
        data = response.json
        assert data["year"] == 2024
        assert data["total"] == 3
        assert data["unique_types"] == 2
        assert len(data["counts"]) == 2

    @responses.activate
    def test_counts_endpoint_no_year(self, client):
        mock_data = [{"sr_type_desc": "Pothole"}]
        responses.add(
            responses.GET,
            BASE_URL,
            json=mock_data,
            status=200,
        )

        response = client.get("/api/counts")

        assert response.status_code == 200
        data = response.json
        assert data["year"] is None

    @responses.activate
    def test_counts_endpoint_api_error(self, client):
        responses.add(
            responses.GET,
            BASE_URL,
            json={"error": "Server error"},
            status=500,
        )

        response = client.get("/api/counts?year=2024")

        assert response.status_code == 500
        assert "error" in response.json

    @responses.activate
    def test_counts_sorted_by_count_descending(self, client):
        mock_data = [
            {"sr_type_desc": "Rare"},
            {"sr_type_desc": "Common"},
            {"sr_type_desc": "Common"},
            {"sr_type_desc": "Common"},
            {"sr_type_desc": "Medium"},
            {"sr_type_desc": "Medium"},
        ]
        responses.add(
            responses.GET,
            BASE_URL,
            json=mock_data,
            status=200,
        )

        response = client.get("/api/counts")
        data = response.json

        counts = data["counts"]
        assert counts[0]["type"] == "Common"
        assert counts[0]["count"] == 3
        assert counts[1]["type"] == "Medium"
        assert counts[1]["count"] == 2
        assert counts[2]["type"] == "Rare"
        assert counts[2]["count"] == 1
