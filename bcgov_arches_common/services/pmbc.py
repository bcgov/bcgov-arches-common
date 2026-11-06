"""PMBC Parcel Fabric service: query the BC ParcelMap WFS by PID or PIN."""

import json
import logging

import urllib3
from django.conf import settings

logger = logging.getLogger(__name__)

_WFS_URL = (
    "https://openmaps.gov.bc.ca/geo/pub/WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW/ows"
)

_WFS_PARAMS_BASE = {
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetFeature",
    "typeNames": "WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW",
    "srsName": "EPSG:4326",
    "outputFormat": "application/json",
}


class PmbcError(Exception):
    """Raised when the PMBC WFS returns an unexpected or unparseable response."""


def _get_http():
    proxy = getattr(settings, "TILESERVER_OUTBOUND_PROXY", None)
    if proxy:
        return urllib3.ProxyManager(proxy)
    return urllib3.PoolManager()


def _query(cql_filter: str) -> dict:
    params = {**_WFS_PARAMS_BASE, "CQL_FILTER": cql_filter}
    response = _get_http().request("GET", _WFS_URL, fields=params)
    if response.status != 200:
        raise PmbcError(f"WFS returned HTTP {response.status}")
    try:
        return json.loads(response.data.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise PmbcError("WFS response could not be parsed as JSON") from exc


def fetch_by_pid(pid: str) -> dict:
    """Return the WFS FeatureCollection for the parcel with the given PID."""
    logger.info("PMBC WFS query by PID: %s", pid)
    return _query(f"PID='{pid}'")


def fetch_by_pin(pin: str) -> dict:
    """Return the WFS FeatureCollection for the parcel with the given PIN."""
    logger.info("PMBC WFS query by PIN: %s", pin)
    return _query(f"PIN={pin}")
