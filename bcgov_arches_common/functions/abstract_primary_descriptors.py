from arches.app.datatypes.datatypes import DataTypeFactory
from collections import defaultdict
import html
import logging
from django.db.models import Q
from arches.app.models import models
from arches.app.functions.primary_descriptors import (
    AbstractPrimaryDescriptorsFunction as CoreDescriptorsFunction,
)

logger = logging.getLogger(__name__)


class AbstractPrimaryDescriptors(CoreDescriptorsFunction):
    _template = "<div class='bc-popup-entry'><div class='bc-popup-label'>%s</div><div class='bc-popup-value'>%s</div></div>"
    _graph_slug = ""
    _name_node_aliases = []
    _card_node_aliases = []
    _popup_node_aliases = []

    _html_nodes = []

    _datatype_factory = None

    _nodes = {}
    _datatypes = {}
    _initialized = False

    # Initializes the node and datatype lookups. Assigning through cls gives
    # each subclass its own dicts, so sibling descriptors for different graphs
    # do not share (or clobber) one another's nodes.
    @classmethod
    def initialize(cls):
        cls._nodes = {}
        cls._datatypes = {}
        if not cls._datatype_factory:
            cls._datatype_factory = DataTypeFactory()
        for alias in cls.get_all_nodes():
            node = models.Node.objects.filter(
                alias=alias,
                graph__slug=cls._graph_slug,
                source_identifier__isnull=True,
            ).first()
            if node:
                cls._nodes[alias] = node
                cls._datatypes[alias] = cls._datatype_factory.get_instance(
                    node.datatype
                )
            else:
                # Otherwise the alias just vanishes from the descriptor.
                logger.warning(
                    "%s: no node '%s' on graph '%s'",
                    cls.__name__,
                    alias,
                    cls._graph_slug,
                )

        # Get nodes that have HTML representations
        all_nodes = set(cls._nodes.values())
        cnws = (
            models.CardXNodeXWidget.objects.filter(node__in=all_nodes)
            .filter(widget__name="rich-text-widget")
            .all()
        )
        cls._html_nodes = [cnw.node.alias for cnw in cnws]

        cls._initialized = True

    @classmethod
    def get_all_nodes(cls):
        return cls._name_node_aliases + cls._popup_node_aliases + cls._card_node_aliases

    def get_name_descriptor(self, resource, config, context):
        return self.get_values_in_order(
            self._name_node_aliases,
            config,
            resource,
            connector=" - ",
        )

    def get_search_card_descriptor(self, resource, config, context):
        return self.get_values_in_order(self._card_node_aliases, config, resource)

    def get_map_popup_descriptor(self, resource, config, context):
        return self.get_values_in_order(self._popup_node_aliases, config, resource)

    def get_values_in_order(
        self, aliases, config, resource, tile_data=None, connector=""
    ) -> str:
        display_values = []
        # One query for the resource's tiles rather than one per alias. Skipped
        # when the caller supplied the tiles, or when there is nothing to read.
        tiles_by_nodegroup = (
            self._tiles_by_nodegroup(resource, aliases)
            if aliases and not tile_data
            else None
        )
        for node_alias in aliases:
            value = self._get_value_from_node(
                node_alias=node_alias,
                resourceinstanceid=resource,
                data_tile=tile_data,
                tiles_by_nodegroup=tiles_by_nodegroup,
            )
            if value:
                if config["first_only"]:
                    return self._format_value(
                        self._nodes[node_alias].name,
                        value,
                        config,
                        node_alias in self._html_nodes,
                    )
                display_values.append(
                    self._format_value(
                        self._nodes[node_alias].name,
                        value,
                        config,
                        node_alias in self._html_nodes,
                    )
                )
        return connector.join(display_values)

    def get_primary_descriptor_from_nodes(
        self, resource, config, context=None, descriptor=None
    ):
        if not self._initialized:
            self.initialize()
        if descriptor == "name":
            return self.get_name_descriptor(resource, config, context=None)
        elif descriptor == "description":
            return self.get_search_card_descriptor(resource, config, context=None)
        else:
            return self.get_map_popup_descriptor(resource, config, context=None)

    @classmethod
    def _tiles_by_nodegroup(cls, resource, aliases=None):
        """The resource's tiles grouped by nodegroup id. A descriptor reads
        several nodegroups per call, which was a query apiece. Pass the aliases
        being read to avoid pulling every tile on a tile-heavy resource."""
        query = Q(resourceinstance_id=resource)
        if aliases is not None:
            query &= Q(
                nodegroup_id__in={
                    cls._nodes[a].nodegroup_id for a in aliases if a in cls._nodes
                }
            )
        grouped = defaultdict(list)
        for tile in models.TileModel.objects.filter(query):
            grouped[str(tile.nodegroup_id)].append(tile)
        return grouped

    @classmethod
    def _get_value_from_node(
        cls,
        node_alias,
        resourceinstanceid=None,
        data_tile=None,
        tiles_by_nodegroup=None,
    ):
        """
        get the display value from the resource tile(s) for the node with the given name

        Keyword Arguments

        node_alias -- node alias of the data to extract
        resourceinstanceid -- id of resource instance used to fetch the tile(s) if data_tile not specified
        data_tile -- if specified, the tile to extract the value from
        tiles_by_nodegroup -- if specified, tiles already fetched for the resource,
            keyed by nodegroup id, used in place of a per-node query
        """
        if node_alias not in cls._nodes:
            return None

        display_values = []
        datatype = cls._datatypes[node_alias]
        nodegroup_id = cls._nodes[node_alias].nodegroup_id

        if data_tile:
            tiles = data_tile if isinstance(data_tile, list) else [data_tile]
        elif tiles_by_nodegroup is not None:
            tiles = tiles_by_nodegroup[str(nodegroup_id)]
        else:
            tiles = (
                models.TileModel.objects.filter(nodegroup_id=nodegroup_id)
                .filter(resourceinstance_id=resourceinstanceid)
                .all()
            )

        for tile in tiles:
            if tile:
                display_values.append(
                    datatype.get_display_value(tile, cls._nodes[node_alias])
                )

        return (
            None
            if len(display_values) == 0
            else (display_values[0] if len(display_values) == 1 else display_values)
        )

    @classmethod
    def _format_value(cls, name, value, config, is_html=False):
        def escape_value(val):
            if not val:
                return val
            return html.escape(str(val)) if not is_html else str(val)

        if value is None:
            return ""
        elif isinstance(value, list):
            value = set([escape_value(v) for v in value if v != ""])
            if "" in value:
                value.remove("")
            value = ", ".join(sorted(value))
        else:
            value = escape_value(value)

        if config["show_name"]:
            return cls._template % (html.escape(name), value)
        return value
