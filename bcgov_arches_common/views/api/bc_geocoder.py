import json
import logging
from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest
from django.views import View
from bcgov_arches_common.views.base import OutboundProxyMixin
import urllib3

logger = logging.getLogger(__name__)

# Configurable via BC_GEOCODER_CONFIG in Django settings, e.g.:
#
#   BC_GEOCODER_CONFIG = {
#       "url": "https://geocodertst.api.gov.bc.ca/addresses.json",
#       "api_key": "your-api-key",   # optional
#       "max_results": "25",         # optional, default "10"
#       "min_score": "5",            # optional, default "2"
#   }
#
# Environment URLs:
#   PROD  https://geocoder.api.gov.bc.ca/addresses.json
#   TEST  https://geocodertst.api.gov.bc.ca/addresses.json
#   DLVR  https://geocoderdlv.api.gov.bc.ca/addresses.json
_GEOCODER_DEFAULT_URL = "https://geocoder.api.gov.bc.ca/addresses.json"
_GEOCODER_DEFAULT_MAX_RESULTS = "10"
_GEOCODER_DEFAULT_MIN_SCORE = "2"

GEOCODER_FIXED_PARAMS = {
    "hasPid": "false",
    "locationDescriptor": "any",
    "interpolation": "adaptive",
    "echo": "true",
    "brief": "false",
    "autoComplete": "true",
    "exactSpelling": "false",
    "fuzzyMatch": "false",
    "setBack": "0",
    "outputSRS": "4326",
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

        config = getattr(settings, "BC_GEOCODER_CONFIG", {})
        geocoder_url = config.get("url", _GEOCODER_DEFAULT_URL)
        api_key = config.get("api_key")
        max_results = config.get("max_results", _GEOCODER_DEFAULT_MAX_RESULTS)
        min_score = config.get("min_score", _GEOCODER_DEFAULT_MIN_SCORE)

        params = {
            **GEOCODER_FIXED_PARAMS,
            "maxResults": str(max_results),
            "minScore": str(min_score),
            "addressString": address_string,
        }
        if api_key:
            params["apikey"] = api_key

        logger.info(
            f"Requesting BC Geocoder data for addressString: {address_string!r}"
        )

        try:
            req = self.get_request_pool_manager()
            response = req.request(method="GET", url=geocoder_url, fields=params)

            if response.status != 200:
                raise urllib3.exceptions.HTTPError(f"HTTP error {response.status}")

            data = json.loads(response.data.decode("utf-8"))

            logger.info(
                f"Received BC Geocoder response for {address_string!r}, "
                f"status: {response.status}"
            )

            return JsonResponse(data, safe=False)

        except urllib3.exceptions.NewConnectionError:
            logger.error(
                f"Connection error fetching geocoder data for: {address_string!r}"
            )
            return JsonResponse(
                {"error": "Could not connect to the BC Geocoder"},
                status=502,
            )

        except urllib3.exceptions.TimeoutError:
            logger.error(f"Timeout fetching geocoder data for: {address_string!r}")
            return JsonResponse(
                {"error": "The request to the BC Geocoder timed out"},
                status=504,
            )

        except urllib3.exceptions.HTTPError as e:
            logger.error(f"Error fetching geocoder data for {address_string!r}: {e}")
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
