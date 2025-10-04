import logging
from rest_framework.views import APIView
from django.db.models import F
from django.contrib.auth.models import User

from typing import Any, ClassVar
from arches.app.models.models import TileModel, EditLog, Node
from arches import VERSION as arches_version
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from arches_querysets.rest_framework.permissions import ReadOnly, ResourceEditor
from arches_querysets.rest_framework.multipart_json_parser import MultiPartJSONParser

logger = logging.getLogger(__name__)


class ResourceEditLogView(APIView):
    """Get modification information for a resource or specific tile/nodegroup."""

    permission_classes: ClassVar = [ResourceEditor | ReadOnly]
    parser_classes: ClassVar = [JSONParser, MultiPartJSONParser]

    def get(self, request: Any, resource_id: str) -> Response:
        """Get edit log information for a resource."""

        try:
            tile_id = request.GET.get("tile_id")
            nodegroup_id = request.GET.get("nodegroup_id")
            nodegroup_alias = request.GET.get("nodegroup_alias")
            graph_slug = request.GET.get("graph_slug")

            if nodegroup_alias and graph_slug and not nodegroup_id:
                nodegroup_id = self._get_nodegroup_id_from_alias(
                    graph_slug, nodegroup_alias
                )

                if not nodegroup_id:
                    return Response(
                        {
                            "modified_on": None,
                            "modified_by": None,
                            "error": f"Could not resolve nodegroup alias '{nodegroup_alias}'",
                        }
                    )

            if tile_id:
                modification_data = self._get_tile_modification(resource_id, tile_id)
            elif nodegroup_id:
                modification_data = self._get_nodegroup_modification(
                    resource_id, nodegroup_id
                )
            else:
                modification_data = self._get_resource_modification(resource_id)

            return Response(modification_data)

        except Exception:
            error = "Error fetching audit log information."
            logger.exception(error)

            return Response(
                {"modified_on": None, "modified_by": None, "error": error}, status=500
            )

    def _get_nodegroup_id_from_alias(self, graph_slug: str, alias: str) -> str | None:
        try:
            nodes = Node.objects.filter(
                graph__slug=graph_slug, alias=alias, pk=F("nodegroup_id")
            ).values("nodegroup_id")
            if arches_version >= (8, 0):
                nodes = nodes.filter(source_identifier=None)
            node = nodes.get()

            return str(node["nodegroup_id"]) if node else None
        except Exception:
            logger.exception(f"Error resolving nodegroup alias: {alias}")
            return None

    def _get_nodegroup_modification(
        self, resource_id: str, nodegroup_id: str
    ) -> dict[str, Any]:
        # Find child nodegroups
        parent_tiles = TileModel.objects.filter(
            nodegroup_id=nodegroup_id, resourceinstance_id=resource_id
        ).values_list("tileid", flat=True)

        # Get child tiles
        child_nodegroups = (
            TileModel.objects.filter(parenttile_id__in=parent_tiles)
            .values_list("nodegroup_id", flat=True)
            .distinct()
        )

        # Combine parent and child nodegroups
        all_nodegroups = [nodegroup_id, *list(child_nodegroups)]

        # Get the edit log entry
        edit_log = (
            EditLog.objects.filter(
                resourceinstanceid=resource_id, nodegroupid__in=all_nodegroups
            )
            .order_by("-timestamp")
            .first()
        )

        if edit_log:
            # Get nodegroup alias
            nodegroup_alias = None

            if edit_log.nodegroupid:
                node = (
                    Node.objects.filter(
                        nodegroup_id=edit_log.nodegroupid, pk=F("nodegroup_id")
                    )
                    .values("alias")
                    .first()
                )

                nodegroup_alias = node["alias"] if node else None

            return self._format_response_from_object(edit_log, nodegroup_alias)

        return {
            "modified_on": None,
            "modified_by": None,
            "nodegroup_id": nodegroup_id,
            "error": "No modifications found",
        }

    def _get_tile_modification(self, resource_id: str, tile_id: str) -> dict[str, Any]:
        """Get modification info for a specific tile using Django ORM."""

        edit_log = (
            EditLog.objects.filter(
                resourceinstanceid=resource_id, tileinstanceid=tile_id
            )
            .order_by("-timestamp")
            .first()
        )

        if edit_log:
            return self._format_response_from_object(edit_log)

        return {
            "modified_on": None,
            "modified_by": None,
            "tile_id": tile_id,
            "error": "No modifications found for this tile",
        }

    def _get_resource_modification(self, resource_id: str) -> dict[str, Any]:
        """Get the most recent modification for the entire resource using Django ORM."""

        edit_log = (
            EditLog.objects.filter(resourceinstanceid=resource_id)
            .order_by("-timestamp")
            .first()
        )

        if edit_log:
            return self._format_response_from_object(edit_log)

        return {
            "modified_on": None,
            "modified_by": None,
            "error": "No modifications found",
        }

    def _format_response_from_object(
        self, edit_log: EditLog, nodegroup_alias: str | None = None
    ) -> dict[str, Any]:
        """Format response from an EditLog object."""

        username = edit_log.user_username
        first_name = edit_log.user_firstname
        last_name = edit_log.user_lastname

        if not any([username, first_name, last_name]) and edit_log.userid:
            try:
                user_id = int(edit_log.userid)
                user = User.objects.filter(id=user_id).first()

                if user:
                    username = username or user.username
                    first_name = first_name or user.first_name
                    last_name = last_name or user.last_name
            except (ValueError, TypeError):
                pass

        if first_name and last_name:
            display_name = f"{first_name} {last_name}"
        elif username:
            display_name = username
        elif first_name:
            display_name = first_name
        else:
            display_name = self._get_system_user_name(edit_log.edittype)

        result = {
            "modified_on": (
                edit_log.timestamp.isoformat() if edit_log.timestamp else None
            ),
            "modified_by": display_name,
            "transaction_id": (
                str(edit_log.transactionid) if edit_log.transactionid else None
            ),
            "edit_type": edit_log.edittype,
            "user_email": edit_log.user_email,
            "is_system_edit": not bool(username or first_name or last_name),
        }

        if edit_log.tileinstanceid:
            result["tile_id"] = str(edit_log.tileinstanceid)

        if edit_log.nodegroupid:
            result["nodegroup_id"] = str(edit_log.nodegroupid)

        if nodegroup_alias:
            result["nodegroup_alias"] = nodegroup_alias

        return result

    def _get_system_user_name(self, edit_type: str) -> str:
        """Generate appropriate system user names based on edit type."""

        if not edit_type:
            return "System User"

        edit_type_lower = edit_type.lower()

        if "import" in edit_type_lower or "etl" in edit_type_lower:
            return "Data Import"

        if "migration" in edit_type_lower:
            return "Data Migration"

        if "create" in edit_type_lower:
            return "System Import"

        return f"System ({edit_type})"
