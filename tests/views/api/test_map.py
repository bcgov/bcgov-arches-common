import json
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, TestCase


class MapDataAPITest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = MagicMock()

    def _make_source(self, source_dict):
        obj = MagicMock()
        obj.source = source_dict
        return obj

    def _get(self, map_sources, settings_overrides=None):
        defaults = {
            "BCGOV_PROXY_PREFIX": "",
            "FORCE_SCRIPT_NAME": "/bcap",
            "PUBLIC_SERVER_ADDRESS": "https://example.com",
            "DEFAULT_BOUNDS": {"type": "FeatureCollection", "features": []},
        }
        if settings_overrides:
            defaults.update(settings_overrides)

        request = self.factory.get("/api/map/")
        request.user = self.user

        with (
            patch(
                "bcgov_arches_common.views.api.map.settings",
                **{k: v for k, v in defaults.items()},
            ) as mock_settings,
            patch(
                "bcgov_arches_common.views.api.map.models.MapSource.objects.all",
                return_value=map_sources,
            ),
            patch(
                "bcgov_arches_common.views.api.map.user_can_read_map_layers",
                return_value=["layer1"],
            ),
        ):
            mock_settings.BCGOV_PROXY_PREFIX = defaults["BCGOV_PROXY_PREFIX"]
            mock_settings.FORCE_SCRIPT_NAME = defaults["FORCE_SCRIPT_NAME"]
            mock_settings.PUBLIC_SERVER_ADDRESS = defaults["PUBLIC_SERVER_ADDRESS"]
            mock_settings.DEFAULT_BOUNDS = defaults["DEFAULT_BOUNDS"]

            from bcgov_arches_common.views.api.map import MapDataAPI

            view = MapDataAPI.as_view()
            response = view(request)

        return response, json.loads(response.content)

    # ------------------------------------------------------------------ prefix
    def test_prefix_from_bcgov_proxy_prefix(self):
        """BCGOV_PROXY_PREFIX takes precedence over FORCE_SCRIPT_NAME."""
        source = self._make_source({"tiles": ["/tiles/wms"]})
        response, data = self._get(
            [source],
            {
                "BCGOV_PROXY_PREFIX": "myprefix",
                "FORCE_SCRIPT_NAME": "/fallback",
                "PUBLIC_SERVER_ADDRESS": "https://example.com",
            },
        )
        self.assertEqual(response.status_code, 200)
        # prefix is /myprefix; PUBLIC_SERVER_ADDRESS doesn't end with it → prepended
        self.assertIn("/myprefix", source.source["tiles"][0])

    def test_prefix_falls_back_to_force_script_name(self):
        """When BCGOV_PROXY_PREFIX is empty, FORCE_SCRIPT_NAME is used."""
        source = self._make_source({"tiles": ["/tiles/wms"]})
        _, data = self._get(
            [source],
            {
                "BCGOV_PROXY_PREFIX": "",
                "FORCE_SCRIPT_NAME": "/bcap",
                "PUBLIC_SERVER_ADDRESS": "https://example.com",
            },
        )
        self.assertIn("/bcap", source.source["tiles"][0])

    # ------------------------------------------------------- tile URL rewriting
    def test_http_tile_url_is_not_rewritten(self):
        """Absolute tile URLs (http/https) are left untouched."""
        original = "https://external.tiles.example.com/wms"
        source = self._make_source({"tiles": [original]})
        self._get([source])
        self.assertEqual(source.source["tiles"][0], original)

    def test_non_http_tile_url_is_rewritten(self):
        """Relative tile URL gets PUBLIC_SERVER_ADDRESS + prefix prepended."""
        source = self._make_source({"tiles": ["/tiles/wms"]})
        _, data = self._get(
            [source],
            {
                "BCGOV_PROXY_PREFIX": "",
                "FORCE_SCRIPT_NAME": "/bcap",
                "PUBLIC_SERVER_ADDRESS": "https://example.com",
            },
        )
        self.assertTrue(
            source.source["tiles"][0].startswith("https://example.com"),
            source.source["tiles"][0],
        )

    def test_prefix_not_duplicated_when_already_in_public_server_address(self):
        """Prefix is not added twice when PUBLIC_SERVER_ADDRESS already ends with it."""
        source = self._make_source({"tiles": ["/tiles/wms"]})
        self._get(
            [source],
            {
                "BCGOV_PROXY_PREFIX": "",
                "FORCE_SCRIPT_NAME": "/bcap",
                "PUBLIC_SERVER_ADDRESS": "https://example.com/bcap",
            },
        )
        url = source.source["tiles"][0]
        self.assertNotIn("/bcap/bcap", url, f"Prefix duplicated in: {url}")

    def test_source_without_tiles_key_is_unchanged(self):
        """Sources without a 'tiles' key are skipped entirely."""
        source = self._make_source({"type": "geojson", "data": "/api/features"})
        original = dict(source.source)
        self._get([source])
        self.assertEqual(source.source, original)

    # ---------------------------------------------------- response structure
    def test_response_contains_expected_keys(self):
        """Response JSON always contains map_layers, map_sources, default_bounds."""
        _, data = self._get([])
        self.assertIn("map_layers", data)
        self.assertIn("map_sources", data)
        self.assertIn("default_bounds", data)

    def test_response_status_200(self):
        response, _ = self._get([])
        self.assertEqual(response.status_code, 200)

    def test_map_layers_from_permission_check(self):
        """map_layers comes from user_can_read_map_layers result."""
        _, data = self._get([])
        self.assertEqual(data["map_layers"], ["layer1"])

    def test_default_bounds_passed_through(self):
        bounds = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}
        _, data = self._get([], {"DEFAULT_BOUNDS": bounds})
        self.assertEqual(data["default_bounds"], bounds)
