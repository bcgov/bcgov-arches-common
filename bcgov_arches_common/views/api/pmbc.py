# views.py
import json
import logging
from django.http import JsonResponse, HttpResponseBadRequest
from django.views import View
from bcgov_arches_common.views.base import OutboundProxyMixin
import urllib3

logger = logging.getLogger(__name__)


class PMBCDataView(View, OutboundProxyMixin):
    """
    Class-based view to fetch parcel data from BC Energy Regulator ArcGIS REST service using PID.

    GET Parameters:
    - pid: The PID value to query, e.g., '0008746320'

    Returns:
    - JsonResponse: The data from the ArcGIS REST endpoint
    """

    def get(self, request, pid, *args, **kwargs):
        # Get PID from request parameters
        # pid = request.GET.get("pid")

        # Validate PID parameter
        if not pid or not pid.isdigit():
            return HttpResponseBadRequest(
                json.dumps(
                    {
                        "error": "Invalid or missing PID parameter. PID should be a numeric value."
                    }
                ),
                content_type="application/json",
            )

        # Construct the URL to the external API
        base_url = "https://geoweb-ags.bc-er.ca/arcgis/rest/services/REFERENCE/PMBC/MapServer/4/query"

        # Define parameters for the request
        params = {
            "where": f"PID={pid}",
            "returnGeometry": "true",
            "outSR": "4326",
            "outFields": "*",
            "f": "geojson",
        }

        logger.info(f"Requesting PMBC data for PID: {pid}")

        try:
            req = self.get_request_pool_manager()
            # Make the request to the external API
            response = req.request(method="GET", url=base_url, fields=params)

            if response.status != 200:
                raise urllib3.exceptions.HTTPError(f"HTTP error {response.status}")

            # Parse JSON data
            data = json.loads(response.data.decode("utf-8"))

            logger.info(f"Received PMBC data for PID: {pid}, status: {response.status}")

            # Add some metadata to the response
            result = {
                "meta": {
                    "source": "BC Energy Regulator ArcGIS REST service",
                    "pid": pid,
                    "timestamp": response.headers.get("Date"),
                },
                "data": data,
            }

            return JsonResponse(result)

        except urllib3.exceptions.TimeoutError:
            logger.error(f"Timeout while fetching PMBC data for PID: {pid}")
            return JsonResponse(
                {"error": "The request to the external API timed out", "pid": pid},
                status=504,
            )  # Gateway Timeout

        except urllib3.exceptions.NewConnectionError:
            logger.error(f"Connection error while fetching PMBC data for PID: {pid}")
            return JsonResponse(
                {"error": "Could not connect to the external API", "pid": pid},
                status=502,
            )  # Bad Gateway

        except urllib3.exceptions.HTTPError as e:
            logger.error(
                f"HTTP error while fetching PMBC data for PID: {pid}: {str(e)}"
            )
            return JsonResponse(
                {
                    "error": f"Error fetching data from external API: {str(e)}",
                    "pid": pid,
                },
                status=500,
            )

        except urllib3.exceptions.RequestError as e:
            logger.error(
                f"Request error while fetching PMBC data for PID: {pid}: {str(e)}"
            )
            return JsonResponse(
                {
                    "error": f"Error fetching data from external API: {str(e)}",
                    "pid": pid,
                },
                status=500,
            )

        except json.JSONDecodeError:
            logger.error(f"JSON decode error while processing PMBC data for PID: {pid}")
            return JsonResponse(
                {"error": "Error parsing response from external API", "pid": pid},
                status=500,
            )

        except Exception as e:
            logger.error(
                f"Unexpected error while fetching PMBC data for PID: {pid}: {str(e)}"
            )
            return JsonResponse(
                {
                    "error": f"Unexpected error: {str(e)}",
                    "pid": pid,
                },
                status=500,
            )
