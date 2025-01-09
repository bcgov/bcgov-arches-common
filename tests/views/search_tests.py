from django.test import TestCase
from django.test.client import RequestFactory
from tests import test_settings


class TestSearchView(TestCase):
    search_view = None
    layers_dir = (
        test_settings.PROJECT_TEST_ROOT
        + "/../bcgov_arches_common/pkg/map_layers/mapbox_spec_json"
    )

    @classmethod
    def setUpClass(cls):
        super(TestSearchView, cls).setUpClass()
        request_factory = RequestFactory()
        # cls.search_view.request = request_factory.get("/bcgov_arches_common/search")
        # cls.search_view.request.user = User.objects.get(username="admin")
        # for subdir in ["basemaps", "overlays"]:
        #     for layerdir in os.listdir(os.path.join(cls.layers_dir, subdir)):
        #         filename = os.path.join(
        #             cls.layers_dir, subdir, layerdir, layerdir + ".json"
        #         )
        #         with open(filename) as f:
        #             d = json.load(f)
        #             layer_name = d["name"]
        #         management.call_command(
        #             "packages",
        #             operation="add_mapbox_layer",
        #             layer_name=layer_name,
        #             mapbox_json_path=filename,
        #             verbosity=3,
        #         )
