import json
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, TestCase
import urllib3

from bcgov_arches_common.views.api.bc_geocoder import (
    BCGeocoderView,
    GEOCODER_FIXED_PARAMS,
)

# ---------------------------------------------------------------------------
# urllib3 exception helpers
# Subclass to bypass parent __init__ constructors that require pool/conn args.
# ---------------------------------------------------------------------------


class _TimeoutError(urllib3.exceptions.TimeoutError):
    def __init__(self):
        Exception.__init__(self)


class _NewConnectionError(urllib3.exceptions.NewConnectionError):
    def __init__(self):
        Exception.__init__(self)


class _RequestError(urllib3.exceptions.RequestError):
    def __init__(self):
        Exception.__init__(self)


# ---------------------------------------------------------------------------
# Sample data
# ---------------------------------------------------------------------------

SAMPLE_RESPONSE = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [-123.3656, 48.4284]},
            "properties": {
                "fullAddress": "100 Fort St, Victoria, BC",
                "civicNumber": 100,
                "streetName": "Fort",
                "streetType": "St",
                "localityName": "Victoria",
            },
        }
    ],
}


class BCGeocoderViewTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _make_upstream_response(self, status=200, data=None):
        resp = MagicMock()
        resp.status = status
        resp.data = json.dumps(data if data is not None else SAMPLE_RESPONSE).encode(
            "utf-8"
        )
        return resp

    def _get(self, address_string=None, mock_upstream=None, side_effect=None):
        params = {}
        if address_string is not None:
            params["addressString"] = address_string

        request = self.factory.get("/api/bc-geocoder", params)

        with patch.object(BCGeocoderView, "get_request_pool_manager") as mock_pm:
            mock_req = MagicMock()
            mock_pm.return_value = mock_req
            if side_effect is not None:
                mock_req.request.side_effect = side_effect
            else:
                mock_req.request.return_value = (
                    mock_upstream or self._make_upstream_response()
                )

            view = BCGeocoderView.as_view()
            response = view(request)

        return response, mock_req

    # ------------------------------------------------------------------
    # Input validation
    # ------------------------------------------------------------------

    def test_missing_address_string_returns_400(self):
        response, _ = self._get()
        self.assertEqual(response.status_code, 400)

    def test_empty_address_string_returns_400(self):
        response, _ = self._get(address_string="")
        self.assertEqual(response.status_code, 400)

    def test_whitespace_only_address_string_returns_400(self):
        response, _ = self._get(address_string="   ")
        self.assertEqual(response.status_code, 400)

    def test_missing_address_error_body_is_json(self):
        response, _ = self._get()
        data = json.loads(response.content)
        self.assertIn("error", data)

    # ------------------------------------------------------------------
    # Successful upstream response
    # ------------------------------------------------------------------

    def test_successful_response_returns_200(self):
        response, _ = self._get(address_string="100 Fort St")
        self.assertEqual(response.status_code, 200)

    def test_successful_response_body_matches_upstream(self):
        response, _ = self._get(address_string="100 Fort St")
        data = json.loads(response.content)
        self.assertEqual(data["type"], "FeatureCollection")
        self.assertIn("features", data)
        self.assertEqual(len(data["features"]), 1)
        self.assertEqual(
            data["features"][0]["properties"]["fullAddress"],
            "100 Fort St, Victoria, BC",
        )

    # ------------------------------------------------------------------
    # Fixed params forwarding
    # ------------------------------------------------------------------

    def test_province_code_param_forwarded_to_upstream(self):
        _, mock_req = self._get(address_string="100 Fort St")
        call_kwargs = mock_req.request.call_args
        fields = call_kwargs.kwargs.get("fields") or call_kwargs[1]["fields"]
        self.assertEqual(fields["provinceCode"], "BC")

    def test_output_srs_param_forwarded_to_upstream(self):
        _, mock_req = self._get(address_string="100 Fort St")
        call_kwargs = mock_req.request.call_args
        fields = call_kwargs.kwargs.get("fields") or call_kwargs[1]["fields"]
        self.assertEqual(fields["outputSRS"], "4326")

    def test_address_string_param_forwarded_to_upstream(self):
        _, mock_req = self._get(address_string="100 Fort St")
        call_kwargs = mock_req.request.call_args
        fields = call_kwargs.kwargs.get("fields") or call_kwargs[1]["fields"]
        self.assertEqual(fields["addressString"], "100 Fort St")

    def test_all_fixed_params_present(self):
        _, mock_req = self._get(address_string="query")
        call_kwargs = mock_req.request.call_args
        fields = call_kwargs.kwargs.get("fields") or call_kwargs[1]["fields"]
        for key in GEOCODER_FIXED_PARAMS:
            self.assertIn(
                key, fields, f"Fixed param '{key}' missing from upstream call"
            )

    def test_address_string_is_stripped_before_forwarding(self):
        _, mock_req = self._get(address_string="  100 Fort St  ")
        call_kwargs = mock_req.request.call_args
        fields = call_kwargs.kwargs.get("fields") or call_kwargs[1]["fields"]
        self.assertEqual(fields["addressString"], "100 Fort St")

    # ------------------------------------------------------------------
    # Upstream HTTP error (non-200 status)
    # ------------------------------------------------------------------

    def test_upstream_non_200_status_returns_500(self):
        upstream = self._make_upstream_response(status=503)
        response, _ = self._get(address_string="100 Fort St", mock_upstream=upstream)
        self.assertEqual(response.status_code, 500)

    def test_upstream_non_200_error_body_is_json(self):
        upstream = self._make_upstream_response(status=503)
        response, _ = self._get(address_string="100 Fort St", mock_upstream=upstream)
        data = json.loads(response.content)
        self.assertIn("error", data)

    # ------------------------------------------------------------------
    # urllib3 network exceptions
    # ------------------------------------------------------------------

    def test_timeout_returns_504(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=_TimeoutError(),
        )
        self.assertEqual(response.status_code, 504)

    def test_timeout_error_body_is_json(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=_TimeoutError(),
        )
        data = json.loads(response.content)
        self.assertIn("error", data)

    def test_connection_error_returns_502(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=_NewConnectionError(),
        )
        self.assertEqual(response.status_code, 502)

    def test_connection_error_body_is_json(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=_NewConnectionError(),
        )
        data = json.loads(response.content)
        self.assertIn("error", data)

    def test_request_error_returns_500(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=_RequestError(),
        )
        self.assertEqual(response.status_code, 500)

    # ------------------------------------------------------------------
    # Malformed upstream body
    # ------------------------------------------------------------------

    def test_invalid_json_upstream_returns_500(self):
        upstream = MagicMock()
        upstream.status = 200
        upstream.data = b"not-valid-json!!!"
        response, _ = self._get(address_string="100 Fort St", mock_upstream=upstream)
        self.assertEqual(response.status_code, 500)

    def test_invalid_json_error_body_is_json(self):
        upstream = MagicMock()
        upstream.status = 200
        upstream.data = b"<html>error</html>"
        response, _ = self._get(address_string="100 Fort St", mock_upstream=upstream)
        data = json.loads(response.content)
        self.assertIn("error", data)

    # ------------------------------------------------------------------
    # Unexpected errors
    # ------------------------------------------------------------------

    def test_unexpected_exception_returns_500(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=RuntimeError("something unexpected"),
        )
        self.assertEqual(response.status_code, 500)

    def test_unexpected_exception_error_body_is_json(self):
        response, _ = self._get(
            address_string="100 Fort St",
            side_effect=RuntimeError("boom"),
        )
        data = json.loads(response.content)
        self.assertIn("error", data)
