from arches.app.functions.base import BaseFunction
from arches.app.models import models
from arches.app.datatypes.datatypes import BooleanDataType
from django.db.models import Q
from arches.app.models.tile import TileValidationError

details = {
    "functionid": "60000000-0000-0000-0000-000000002001",
    "name": "Unique Boolean Value",
    "type": "node",
    "modulename": "unique_boolean_value.py",
    "description": "Enforces that only one card is set to the boolean value for a resource",
    "defaultconfig": {"node_id": "", "unique_value": True, "triggering_nodegroups": []},
    "classname": "UniqueBooleanValue",
    "component": "views/components/functions/unique-boolean-value",
}


class UniqueBooleanValue(BaseFunction):
    @staticmethod
    def _get_effective_value(other_tile, node_id, user_id, request=None):
        """Return the effective node value for a tile.

        Priority order:
        1. In-flight batch data: arches_querysets stashes all incoming tile
           values on the request before calling __preSave, so a tile being
           cleared in the same bulk save shows its new value here even though
           bulk_update hasn't committed yet.
        2. Current user's own provisional edit from the DB (a previous save
           that hasn't been reviewed yet).
        3. Authoritative tile.data column.

        Only the current user's provisional edit is consulted in step 2; edits
        from other authors are intentionally ignored so that a different user's
        provisional True does not silently mask a real conflict.
        """
        if request is not None:
            pending = getattr(request, "_pending_tile_data", {})
            tile_pk_str = str(other_tile.pk)
            if tile_pk_str in pending:
                return pending[tile_pk_str].get(node_id)

        if user_id and other_tile.provisionaledits:
            edit_data = other_tile.provisionaledits.get(user_id)
            if isinstance(edit_data, dict):
                value = edit_data.get("value", {})
                if isinstance(value, dict) and node_id in value:
                    return value[node_id]
        return other_tile.data.get(node_id)

    def save(self, tile, request, context):
        data = tile.data
        node_id = self.config["node_id"]
        node_value = data[node_id]

        user_id = str(request.user.id) if request and request.user else None

        datatype = BooleanDataType()
        if datatype.values_match(self.config["unique_value"], node_value):
            other_tiles = models.TileModel.objects.filter(
                Q(resourceinstance=tile.resourceinstance),
                Q(nodegroup_id=self.config["triggering_nodegroups"][0]),
                ~Q(tileid=tile.tileid),
            )
            for other_tile in other_tiles:
                if datatype.values_match(
                    node_value,
                    self._get_effective_value(other_tile, node_id, user_id, request),
                ):
                    node = models.Node.objects.get(pk=node_id)
                    raise TileValidationError(
                        "%s must be unique within all %s values"
                        % (node_value, node.name)
                    )

    def post_save(self, tile, request, context):
        pass

    def on_import(self, tile, request):
        print("calling on import")

    def get(self, tile, request):
        print("calling get")

    def delete(self, tile, request):
        print("calling delete")
