"""Reference number generation view."""

import logging

from django.http import JsonResponse
from django.views import View

from bcgov_arches_common.services.reference_number import get_next_reference_number

logger = logging.getLogger(__name__)


class ReferenceNumberView(View):
    """Return the next reference number for a node and abbreviation.

    GET /api/reference-number/<nodeid>?abbreviation=PSR&sequence_digits=4
    """

    def get(self, request, nodeid):
        abbreviation = request.GET.get("abbreviation", "").strip()
        if not abbreviation:
            return JsonResponse(
                {
                    "status": "fail",
                    "error_message": "abbreviation parameter is required.",
                },
                status=400,
            )
        try:
            sequence_digits = int(request.GET.get("sequence_digits", 4))
        except ValueError:
            sequence_digits = 4
        try:
            reference_number = get_next_reference_number(nodeid, abbreviation, sequence_digits)
            return JsonResponse({"status": "success", "report_number": reference_number})
        except Exception:
            logger.error(
                "Failed to generate reference number for node %s", nodeid, exc_info=True
            )
            return JsonResponse(
                {
                    "status": "fail",
                    "error_message": "Failed to generate reference number.",
                },
                status=500,
            )
