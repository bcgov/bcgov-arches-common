from django.views.generic import View

from arches.app.models import models
from arches.app.models.system_settings import settings
from arches.app.utils.response import JSONResponse
from arches.app.utils.permission_backend import user_can_read_map_layers


class MapDataAPI(View):
    def get(self, request):
        map_layers = user_can_read_map_layers(request.user)
        map_sources = list(models.MapSource.objects.all())
        for map_source in map_sources:
            if "tiles" in map_source.source:
                if not map_source.source["tiles"][0].startswith("http"):
                    source = "{}{}".format(
                        settings.PUBLIC_SERVER_ADDRESS, map_source.source["tiles"][0]
                    )
                    map_source.source["tiles"][0] = source

        return JSONResponse(
            {
                "map_layers": map_layers,
                "map_sources": map_sources,
                "default_bounds": settings.DEFAULT_BOUNDS,
            }
        )
