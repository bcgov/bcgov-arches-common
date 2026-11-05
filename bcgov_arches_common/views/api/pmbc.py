"""PMBC Parcel Fabric views: proxy WFS lookups by PID or PIN."""

import logging

import urllib3
from django.http import JsonResponse
from django.views import View

from bcgov_arches_common.services.pmbc import PmbcError, fetch_by_pid, fetch_by_pin

logger = logging.getLogger(__name__)


def _run_query(fetch_fn, identifier: str, label: str) -> JsonResponse:
    try:
        data = fetch_fn(identifier)
    except urllib3.exceptions.TimeoutError:
        logger.error("Timeout fetching PMBC data (%s=%s)", label, identifier)
        return JsonResponse(
            {"error": "The request to the external service timed out."}, status=504
        )
    except urllib3.exceptions.NewConnectionError:
        logger.error("Connection error fetching PMBC data (%s=%s)", label, identifier)
        return JsonResponse(
            {"error": "Could not connect to the external service."}, status=502
        )
    except (urllib3.exceptions.HTTPError, PmbcError):
        logger.error(
            "Error fetching PMBC data (%s=%s)", label, identifier, exc_info=True
        )
        return JsonResponse(
            {"error": "The external service returned an error."}, status=502
        )
    except Exception:
        logger.error(
            "Unexpected error fetching PMBC data (%s=%s)",
            label,
            identifier,
            exc_info=True,
        )
        return JsonResponse({"error": "An unexpected error occurred."}, status=500)

    return JsonResponse(
        {
            "meta": {"source": "ParcelMap BC Parcel Fabric", label: identifier},
            "data": data,
        }
    )


class PMBCParcelByPidView(View):
    """Proxy a PMBC WFS parcel lookup by PID."""

    def get(self, request, pid, *args, **kwargs):
        if not pid or not pid.isdigit():
            return JsonResponse(
                {"error": "Invalid PID. PID must be numeric."}, status=400
            )
        return _run_query(fetch_by_pid, pid, "pid")


class PMBCParcelByPinView(View):
    """Proxy a PMBC WFS parcel lookup by PIN."""

    def get(self, request, pin, *args, **kwargs):
        if not pin or not pin.isdigit():
            return JsonResponse(
                {"error": "Invalid PIN. PIN must be numeric."}, status=400
            )
        return _run_query(fetch_by_pin, pin, "pin")


# Backwards-compatible alias
PMBCDataView = PMBCParcelByPidView
