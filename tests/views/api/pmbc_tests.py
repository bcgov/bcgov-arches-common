import json
from unittest.mock import MagicMock, patch

import urllib3

from django.test import TestCase
from django.test.client import RequestFactory

from bcgov_arches_common.views.api.pmbc import PMBCDataView

MODULE = "bcgov_arches_common.views.api.pmbc"


def _make_http_response(status=200, body=None, headers=None):
    """Build a minimal urllib3-like response mock."""
    response = MagicMock()
    response.status = status
    response.data = json.dumps(
        body or {"type": "FeatureCollection", "features": []}
    ).encode()
    response.headers = headers or {"Date": "Wed, 01 Jan 2025 00:00:00 GMT"}
    return response


class PMBCDataViewTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = PMBCDataView.as_view()

    def _get(self, pid, mock_manager=None):
        """Perform a GET with an optional pre-configured pool manager mock."""
        req = self.factory.get(f"/api/pmbc/{pid}")
        with patch.object(
            PMBCDataView,
            "get_request_pool_manager",
            return_value=mock_manager or MagicMock(),
        ):
            return self.view(req, pid=pid)

    # ------------------------------------------------------------------
    # Input validation
    # ------------------------------------------------------------------

    def test_empty_pid_returns_400(self):
        """An empty PID string is rejected with 400 Bad Request."""
        resp = self._get("")
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.content)
        self.assertIn("Invalid or missing PID", data["error"])

    def test_non_numeric_pid_returns_400(self):
        """A PID containing letters is rejected with 400 Bad Request."""
        resp = self._get("ABC123")
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.content)
        self.assertIn("Invalid or missing PID", data["error"])

    def test_pid_with_special_chars_returns_400(self):
        """A PID with hyphens/spaces is rejected with 400 Bad Request."""
        resp = self._get("123-456")
        self.assertEqual(resp.status_code, 400)

    # ------------------------------------------------------------------
    # Successful response
    # ------------------------------------------------------------------

    def test_valid_pid_returns_200_with_metadata_and_data(self):
        """A numeric PID returns 200 with 'meta' and 'data' keys."""
        pid = "0008746320"
        feature_collection = {"type": "FeatureCollection", "features": [{"id": "1"}]}
        mock_manager = MagicMock()
        mock_manager.request.return_value = _make_http_response(
            body=feature_collection,
            headers={"Date": "Wed, 01 Jan 2025 00:00:00 GMT"},
        )

        resp = self._get(pid, mock_manager)

        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertIn("meta", data)
        self.assertIn("data", data)
        self.assertEqual(data["meta"]["pid"], pid)
        self.assertEqual(data["meta"]["source"], "ParcelMap BC Parcel Fabric")
        self.assertEqual(data["meta"]["timestamp"], "Wed, 01 Jan 2025 00:00:00 GMT")
        self.assertEqual(data["data"], feature_collection)

    def test_valid_pid_requests_correct_url_and_params(self):
        """The external WFS endpoint is called with the expected parameters."""
        pid = "0012345678"
        mock_manager = MagicMock()
        mock_manager.request.return_value = _make_http_response()

        self._get(pid, mock_manager)

        mock_manager.request.assert_called_once()
        _, kwargs = mock_manager.request.call_args
        self.assertEqual(kwargs["method"], "GET")
        self.assertIn("openmaps.gov.bc.ca", kwargs["url"])
        fields = kwargs["fields"]
        self.assertEqual(fields["CQL_FILTER"], f"PID='{pid}'")
        self.assertEqual(fields["srsName"], "EPSG:4326")
        self.assertEqual(fields["request"], "GetFeature")

    # ------------------------------------------------------------------
    # Error handling
    # ------------------------------------------------------------------

    def test_non_200_http_status_returns_500(self):
        """A non-200 status from the external API returns 500."""
        mock_manager = MagicMock()
        mock_manager.request.return_value = _make_http_response(status=503)

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 500)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertEqual(data["pid"], "0008746320")

    def test_timeout_error_returns_504(self):
        """A TimeoutError from urllib3 returns 504 Gateway Timeout."""
        mock_manager = MagicMock()
        mock_manager.request.side_effect = urllib3.exceptions.TimeoutError()

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 504)
        data = json.loads(resp.content)
        self.assertIn("timed out", data["error"])
        self.assertEqual(data["pid"], "0008746320")

    def test_new_connection_error_returns_502(self):
        """A NewConnectionError from urllib3 returns 502 Bad Gateway."""
        mock_manager = MagicMock()
        mock_manager.request.side_effect = urllib3.exceptions.NewConnectionError(
            MagicMock(), "Connection refused"
        )

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 502)
        data = json.loads(resp.content)
        self.assertIn("connect", data["error"])
        self.assertEqual(data["pid"], "0008746320")

    def test_http_error_returns_500(self):
        """An HTTPError from urllib3 returns 500."""
        mock_manager = MagicMock()
        mock_manager.request.side_effect = urllib3.exceptions.HTTPError(
            "upstream error"
        )

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 500)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertEqual(data["pid"], "0008746320")

    def test_request_error_returns_500(self):
        """A generic RequestError from urllib3 returns 500."""
        mock_manager = MagicMock()
        mock_manager.request.side_effect = urllib3.exceptions.RequestError(
            MagicMock(), "http://example.com", "request failed"
        )

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 500)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertEqual(data["pid"], "0008746320")

    def test_json_decode_error_returns_500(self):
        """Malformed JSON in the API response returns 500."""
        mock_manager = MagicMock()
        bad_response = MagicMock()
        bad_response.status = 200
        bad_response.data = b"not valid json {{{"
        bad_response.headers = {}
        mock_manager.request.return_value = bad_response

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 500)
        data = json.loads(resp.content)
        self.assertIn("parsing", data["error"])
        self.assertEqual(data["pid"], "0008746320")

    def test_unexpected_exception_returns_500(self):
        """Any unexpected exception returns 500 with details."""
        mock_manager = MagicMock()
        mock_manager.request.side_effect = RuntimeError("unexpected crash")

        resp = self._get("0008746320", mock_manager)

        self.assertEqual(resp.status_code, 500)
        data = json.loads(resp.content)
        self.assertIn("Unexpected error", data["error"])
        self.assertIn("unexpected crash", data["error"])
        self.assertEqual(data["pid"], "0008746320")
