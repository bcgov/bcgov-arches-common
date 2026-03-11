import json
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.test.client import RequestFactory

from bcgov_arches_common.views.api.map import MapDataAPI

MODULE = "bcgov_arches_common.views.api.map"


def _make_map_source(source_dict):
    ms = MagicMock()
    ms.source = source_dict
    return ms


class MapDataAPITests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = MapDataAPI.as_view()

    def _get(self, mock_settings, mock_layers, mock_sources):
        """Helper: perform a GET and return the parsed JSON response."""
        req = self.factory.get("/api/map")
        req.user = MagicMock()
        with (
            patch(f"{MODULE}.settings", mock_settings),
            patch(f"{MODULE}.user_can_read_map_layers", return_value=mock_layers),
            patch(
                f"{MODULE}.models.MapSource.objects.all", return_value=mock_sources
            ),
        ):
            resp = self.view(req)
        return resp, json.loads(resp.content)

    # ------------------------------------------------------------------
    # Prefix calculation
    # ------------------------------------------------------------------

    def test_response_includes_default_bounds_and_layers(self):
        """Response always includes map_layers and default_bounds keys."""
        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = "app"
        mock_settings.DEFAULT_BOUNDS = {"type": "FeatureCollection"}

        resp, data = self._get(mock_settings, ["layer-1"], [])

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(data["map_layers"], ["layer-1"])
        self.assertEqual(data["default_bounds"], {"type": "FeatureCollection"})
        self.assertIn("map_sources", data)

    def test_prefix_uses_bcgov_proxy_prefix_when_set(self):
        """When BCGOV_PROXY_PREFIX is truthy it is used over FORCE_SCRIPT_NAME."""
        relative_tile_url = "/myapp/tiles/{z}/{x}/{y}"
        source = _make_map_source({"tiles": [relative_tile_url]})

        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = "myapp"
        mock_settings.FORCE_SCRIPT_NAME = "/other"
        mock_settings.PUBLIC_SERVER_ADDRESS = "https://example.com"
        mock_settings.DEFAULT_BOUNDS = {}

        _, data = self._get(mock_settings, [], [source])

        # prefix = "/myapp"; stripped url = "/tiles/{z}/{x}/{y}"
        expected = "https://example.com/tiles/{z}/{x}/{y}"
        self.assertEqual(data["map_sources"][0]["source"]["tiles"][0], expected)

    def test_prefix_falls_back_to_force_script_name(self):
        """When BCGOV_PROXY_PREFIX is falsy, FORCE_SCRIPT_NAME is used."""
        relative_tile_url = "/app/tiles/{z}/{x}/{y}"
        source = _make_map_source({"tiles": [relative_tile_url]})

        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = ""
        mock_settings.FORCE_SCRIPT_NAME = "/app"
        mock_settings.PUBLIC_SERVER_ADDRESS = "https://example.com"
        mock_settings.DEFAULT_BOUNDS = {}

        _, data = self._get(mock_settings, [], [source])

        expected = "https://example.com/tiles/{z}/{x}/{y}"
        self.assertEqual(data["map_sources"][0]["source"]["tiles"][0], expected)

    # ------------------------------------------------------------------
    # Tile URL rewriting
    # ------------------------------------------------------------------

    def test_relative_tile_url_is_rewritten_with_public_server_address(self):
        """A relative tile URL gets the public server address prepended."""
        source = _make_map_source({"tiles": ["/prefix/tiles/{z}/{x}/{y}"]})

        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = "prefix"
        mock_settings.PUBLIC_SERVER_ADDRESS = "https://maps.example.com/"
        mock_settings.DEFAULT_BOUNDS = {}

        _, data = self._get(mock_settings, [], [source])

        # Leading slash of stripped url combined with rstripped server address
        self.assertEqual(
            data["map_sources"][0]["source"]["tiles"][0],
            "https://maps.example.com/tiles/{z}/{x}/{y}",
        )

    def test_absolute_tile_url_is_not_modified(self):
        """An already-absolute (http/https) tile URL is left unchanged."""
        original_url = "https://external.tiles.example.com/{z}/{x}/{y}"
        source = _make_map_source({"tiles": [original_url]})

        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = "prefix"
        mock_settings.PUBLIC_SERVER_ADDRESS = "https://maps.example.com"
        mock_settings.DEFAULT_BOUNDS = {}

        _, data = self._get(mock_settings, [], [source])

        self.assertEqual(
            data["map_sources"][0]["source"]["tiles"][0], original_url
        )

    def test_source_without_tiles_key_is_unchanged(self):
        """Sources that have no 'tiles' key are passed through untouched."""
        source = _make_map_source({"type": "geojson", "data": "/api/data.geojson"})

        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = "prefix"
        mock_settings.PUBLIC_SERVER_ADDRESS = "https://maps.example.com"
        mock_settings.DEFAULT_BOUNDS = {}

        _, data = self._get(mock_settings, [], [source])

        self.assertNotIn("tiles", data["map_sources"][0]["source"])
        self.assertEqual(
            data["map_sources"][0]["source"]["data"], "/api/data.geojson"
        )

    def test_multiple_sources_processed_independently(self):
        """Relative and absolute tile sources in the same request are each handled correctly."""
        relative_source = _make_map_source({"tiles": ["/app/tiles/{z}/{x}/{y}"]})
        absolute_source = _make_map_source(
            {"tiles": ["https://cdn.example.com/{z}/{x}/{y}"]}
        )

        mock_settings = MagicMock()
        mock_settings.BCGOV_PROXY_PREFIX = "app"
        mock_settings.PUBLIC_SERVER_ADDRESS = "https://maps.example.com"
        mock_settings.DEFAULT_BOUNDS = {}

        _, data = self._get(mock_settings, [], [relative_source, absolute_source])

        self.assertEqual(
            data["map_sources"][0]["source"]["tiles"][0],
            "https://maps.example.com/tiles/{z}/{x}/{y}",
        )
        self.assertEqual(
            data["map_sources"][1]["source"]["tiles"][0],
            "https://cdn.example.com/{z}/{x}/{y}",
        )
