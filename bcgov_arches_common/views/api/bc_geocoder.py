import json
import logging
from django.http import JsonResponse, HttpResponseBadRequest
from django.views import View
from bcgov_arches_common.views.base import OutboundProxyMixin
import urllib3

logger = logging.getLogger(__name__)

GEOCODER_BASE_URL = "https://geocoder.api.gov.bc.ca/addresses.json"

GEOCODER_FIXED_PARAMS = {
    "hasPid": "false",
    "locationDescriptor": "any",
    "maxResults": "10",
    "interpolation": "adaptive",
    "echo": "true",
    "brief": "false",
    "autoComplete": "true",
    "exactSpelling": "false",
    "fuzzyMatch": "false",
    "setBack": "0",
    "outputSRS": "4326",
    "minScore": "2",
    "provinceCode": "BC",
}


class BCGeocoderView(View, OutboundProxyMixin):
    """
    Proxy view for the BC Physical Address Geocoder.

    Accepts a single GET query parameter:

        addressString  –  the partial or full address to search for

    All other parameters are fixed and forwarded to the upstream geocoder.

    Returns the geocoder JSON response unchanged.
    """

    def get(self, request, *args, **kwargs):
        address_string = request.GET.get("addressString", "").strip()

        if not address_string:
            return HttpResponseBadRequest(
                json.dumps({"error": "Missing required parameter: addressString"}),
                content_type="application/json",
            )

        params = {**GEOCODER_FIXED_PARAMS, "addressString": address_string}

        logger.info(
            f"Requesting BC Geocoder data for addressString: {address_string!r}"
        )

        try:
            req = self.get_request_pool_manager()
            response = req.request(method="GET", url=GEOCODER_BASE_URL, fields=params)

            if response.status != 200:
                raise urllib3.exceptions.HTTPError(f"HTTP error {response.status}")

            data = json.loads(response.data.decode("utf-8"))

            logger.info(
                f"Received BC Geocoder response for {address_string!r}, "
                f"status: {response.status}"
            )

            return JsonResponse(data, safe=False)

        except urllib3.exceptions.TimeoutError:
            logger.error(f"Timeout fetching geocoder data for: {address_string!r}")
            return JsonResponse(
                {"error": "The request to the BC Geocoder timed out"},
                status=504,
            )

        except urllib3.exceptions.NewConnectionError:
            logger.error(
                f"Connection error fetching geocoder data for: {address_string!r}"
            )
            return JsonResponse(
                {"error": "Could not connect to the BC Geocoder"},
                status=502,
            )

        except urllib3.exceptions.HTTPError as e:
            logger.error(
                f"HTTP error fetching geocoder data for {address_string!r}: {e}"
            )
            return JsonResponse(
                {"error": "Error fetching data from the BC Geocoder"},
                status=500,
            )

        except urllib3.exceptions.RequestError as e:
            logger.error(
                f"Request error fetching geocoder data for {address_string!r}: {e}"
            )
            return JsonResponse(
                {"error": "Error fetching data from the BC Geocoder"},
                status=500,
            )

        except json.JSONDecodeError:
            logger.error(
                f"JSON decode error processing geocoder response for: {address_string!r}"
            )
            return JsonResponse(
                {"error": "Error parsing response from the BC Geocoder"},
                status=500,
            )

        except Exception as e:
            logger.error(
                f"Unexpected error fetching geocoder data for {address_string!r}: {e}"
            )
            return JsonResponse(
                {"error": "An unexpected internal error occurred"},
                status=500,
            )
