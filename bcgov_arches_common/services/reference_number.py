"""Reference number sequence service.

Generates the next reference number for a given Arches node and abbreviation.
Format: <ABBREVIATION>-<year>-<seq>  e.g. PSR-2024-0001
"""

import re
from datetime import date

from arches.app.models import models


def get_next_reference_number(
    node_id: str, abbreviation: str, sequence_digits: int = 4
) -> str:
    """Return the next sequential reference number for *node_id* / *abbreviation*.

    Scans existing tile values for the current year and abbreviation prefix
    and returns the next number in the sequence, zero-padded to *sequence_digits*
    digits (default 4).
    """
    current_year = str(date.today().year)
    abbr = abbreviation.upper()
    node = models.Node.objects.get(nodeid=node_id)
    last = (
        models.TileModel.objects.filter(nodegroup_id=node.nodegroup_id)
        .filter(**{f"data__{node_id}__startswith": f"{abbr}-{current_year}-"})
        .values_list(f"data__{node_id}", flat=True)
        .order_by(f"-data__{node_id}")
        .first()
    )
    pad = max(1, int(sequence_digits))
    if last is None:
        return f"{abbr}-{current_year}-{'1'.zfill(pad)}"
    seq = int(re.split("-", last)[2]) + 1
    return re.sub(r"\d+$", str(seq).zfill(pad), last)
