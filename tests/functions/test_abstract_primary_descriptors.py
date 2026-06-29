from unittest.mock import patch, MagicMock
from django.test import TestCase

import arches.app.datatypes.datatypes
from bcgov_arches_common.functions.abstract_primary_descriptors import (
    AbstractPrimaryDescriptors,
)


class AbstractPrimaryDescriptorsTestCase(TestCase):
    def setUp(self):
        self.mock_nodes = self._create_mock_nodes()
        self.mock_datatype = MagicMock()
        self.mock_datatype.get_display_value.side_effect = (
            lambda tile, node: f"value_for_{node.alias}"
        )
        self.config = {"first_only": False, "show_name": True}

        self.reset_class_state()

    def reset_class_state(self):
        AbstractPrimaryDescriptors._graph_slug = "test_graph"
        AbstractPrimaryDescriptors._name_node_aliases = ["alias1"]
        AbstractPrimaryDescriptors._card_node_aliases = ["alias2"]
        AbstractPrimaryDescriptors._popup_node_aliases = []
        AbstractPrimaryDescriptors._nodes = {}
        AbstractPrimaryDescriptors._datatypes = {}
        AbstractPrimaryDescriptors._initialized = False

    def _create_mock_nodes(self):
        node1 = MagicMock()
        node1.alias = "alias1"
        node1.nodegroup_id = "group1"
        node1.datatype = "string"
        node1.name = "Node 1"

        node2 = MagicMock()
        node2.alias = "alias2"
        node2.nodegroup_id = "group2"
        node2.datatype = "string"
        node2.name = "Node 2"

        return {"alias1": node1, "alias2": node2}

    @patch(
        "bcgov_arches_common.functions.abstract_primary_descriptors.models.CardXNodeXWidget"
    )
    @patch("bcgov_arches_common.functions.abstract_primary_descriptors.models.Node")
    @patch("bcgov_arches_common.functions.abstract_primary_descriptors.DataTypeFactory")
    def test_initialize_sets_nodes_and_datatypes(
        self, mock_factory, mock_node_model, mock_cnw
    ):
        mock_factory.return_value.get_instance.return_value = self.mock_datatype
        mock_node_model.objects.filter.return_value.first.side_effect = (
            lambda: self.mock_nodes["alias1"]
        )
        mock_cnw.objects.filter.return_value.filter.return_value.all.return_value = []

        descriptors = AbstractPrimaryDescriptors()
        descriptors.initialize()

        self.assertEqual(descriptors._nodes["alias1"], self.mock_nodes["alias1"])
        self.assertIsInstance(
            descriptors._datatypes["alias1"],
            arches.app.datatypes.datatypes.StringDataType,
        )
        self.assertTrue(descriptors._initialized)

    @patch(
        "bcgov_arches_common.functions.abstract_primary_descriptors.models.TileModel"
    )
    def test_get_value_from_node_with_tile_model(self, mock_tile_model):
        AbstractPrimaryDescriptors._nodes = self.mock_nodes
        AbstractPrimaryDescriptors._datatypes = {"alias1": self.mock_datatype}
        mock_tile_model.objects.filter.return_value.all.return_value = [
            MagicMock(),
            MagicMock(),
        ]

        result = AbstractPrimaryDescriptors._get_value_from_node(
            "alias1", data_tile=self._create_mock_nodes()
        )

        self.assertEqual(result, "value_for_alias1")

    @patch.object(AbstractPrimaryDescriptors, "_get_value_from_node")
    def test_get_values_in_order_returns_formatted_html(self, mock_get_value):
        AbstractPrimaryDescriptors._nodes = {
            "alias1": MagicMock(alias="alias1", name="Mock Node")
        }
        mock_get_value.return_value = "MockValue"

        result = AbstractPrimaryDescriptors().get_values_in_order(
            aliases=["alias1"], config=self.config, resource="res-id"
        )

        self.assertIn("Mock Node", result)
        self.assertIn("MockValue", result)
        self.assertTrue(result.startswith("<div"))

    @patch.object(AbstractPrimaryDescriptors, "get_values_in_order")
    def test_get_name_descriptor_delegates(self, mock_get_values):
        AbstractPrimaryDescriptors._name_node_aliases = ["alias1"]
        mock_get_values.return_value = "NameDescriptor"

        result = AbstractPrimaryDescriptors().get_name_descriptor(
            "res-id", self.config, None
        )

        self.assertEqual(result, "NameDescriptor")
        mock_get_values.assert_called_once()

    @patch.object(AbstractPrimaryDescriptors, "get_values_in_order")
    def test_get_search_card_descriptor_delegates(self, mock_get_values):
        AbstractPrimaryDescriptors._card_node_aliases = ["alias2"]
        mock_get_values.return_value = "CardDescriptor"

        result = AbstractPrimaryDescriptors().get_search_card_descriptor(
            "res-id", self.config, None
        )

        self.assertEqual(result, "CardDescriptor")
        mock_get_values.assert_called_once()

    @patch.object(AbstractPrimaryDescriptors, "get_values_in_order")
    def test_get_map_popup_descriptor_delegates(self, mock_get_values):
        AbstractPrimaryDescriptors._popup_node_aliases = ["alias2"]
        mock_get_values.return_value = "PopupDescriptor"

        result = AbstractPrimaryDescriptors().get_map_popup_descriptor(
            "res-id", self.config, None
        )

        self.assertEqual(result, "PopupDescriptor")
        mock_get_values.assert_called_once()

    @patch.object(AbstractPrimaryDescriptors, "initialize")
    @patch.object(AbstractPrimaryDescriptors, "get_name_descriptor")
    @patch.object(AbstractPrimaryDescriptors, "get_search_card_descriptor")
    @patch.object(AbstractPrimaryDescriptors, "get_map_popup_descriptor")
    def test_get_primary_descriptor_from_nodes_dispatches_properly(
        self, mock_map, mock_card, mock_name, mock_init
    ):
        AbstractPrimaryDescriptors._initialized = False
        mock_name.return_value = "NameResult"
        mock_card.return_value = "CardResult"
        mock_map.return_value = "MapResult"

        func = AbstractPrimaryDescriptors()

        result = func.get_primary_descriptor_from_nodes(
            "res-id", self.config, descriptor="name"
        )
        self.assertEqual(result, "NameResult")

        result = func.get_primary_descriptor_from_nodes(
            "res-id", self.config, descriptor="description"
        )
        self.assertEqual(result, "CardResult")

        result = func.get_primary_descriptor_from_nodes(
            "res-id", self.config, descriptor="map_popup"
        )
        self.assertEqual(result, "MapResult")

        self.assertTrue(mock_init.called)


class FormatValueTestCase(TestCase):
    """Tests for _format_value — covers the new is_html parameter, the moved
    None check, the new escape_value helper, and the non-list else branch."""

    def test_none_returns_empty_string(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", None, {"show_name": True}
        )
        self.assertEqual(result, "")

    def test_none_returns_empty_string_without_show_name(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", None, {"show_name": False}
        )
        self.assertEqual(result, "")

    def test_string_value_html_escaped_by_default(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", "<script>x</script>", {"show_name": False}
        )
        self.assertNotIn("<script>", result)
        self.assertIn("&lt;script&gt;", result)

    def test_string_value_not_escaped_when_is_html_true(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", "<b>bold</b>", {"show_name": False}, is_html=True
        )
        self.assertIn("<b>bold</b>", result)

    def test_name_always_escaped_even_when_is_html_true(self):
        result = AbstractPrimaryDescriptors._format_value(
            "<b>Name</b>", "value", {"show_name": True}, is_html=True
        )
        self.assertIn("&lt;b&gt;Name&lt;/b&gt;", result)
        self.assertNotIn("<b>Name</b>", result)

    def test_show_name_false_returns_raw_escaped_value(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Node Name", "hello", {"show_name": False}
        )
        self.assertEqual(result, "hello")

    def test_show_name_true_wraps_value_in_template(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Node Name", "hello", {"show_name": True}
        )
        self.assertIn("Node Name", result)
        self.assertIn("hello", result)
        self.assertIn("bc-popup-entry", result)

    def test_list_values_sorted_and_deduplicated(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", ["b", "a", "b"], {"show_name": False}
        )
        self.assertEqual(result, "a, b")

    def test_list_empty_strings_removed(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", ["a", "", "b"], {"show_name": False}
        )
        self.assertEqual(result, "a, b")

    def test_list_html_content_escaped_by_default(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", ["<em>val</em>"], {"show_name": False}
        )
        self.assertNotIn("<em>", result)
        self.assertIn("&lt;em&gt;", result)

    def test_list_html_content_not_escaped_when_is_html_true(self):
        result = AbstractPrimaryDescriptors._format_value(
            "Name", ["<em>val</em>"], {"show_name": False}, is_html=True
        )
        self.assertIn("<em>val</em>", result)


class HtmlNodesInitializeTestCase(TestCase):
    """Tests for the _html_nodes population added to initialize."""

    def setUp(self):
        AbstractPrimaryDescriptors._graph_slug = "test_graph"
        AbstractPrimaryDescriptors._name_node_aliases = ["alias1"]
        AbstractPrimaryDescriptors._card_node_aliases = []
        AbstractPrimaryDescriptors._popup_node_aliases = []
        AbstractPrimaryDescriptors._nodes = {}
        AbstractPrimaryDescriptors._datatypes = {}
        AbstractPrimaryDescriptors._html_nodes = []
        AbstractPrimaryDescriptors._initialized = False

    @patch(
        "bcgov_arches_common.functions.abstract_primary_descriptors.models.CardXNodeXWidget"
    )
    @patch("bcgov_arches_common.functions.abstract_primary_descriptors.models.Node")
    @patch("bcgov_arches_common.functions.abstract_primary_descriptors.DataTypeFactory")
    def test_rich_text_widget_nodes_added_to_html_nodes(
        self, mock_factory, mock_node_model, mock_cnw
    ):
        mock_node = MagicMock()
        mock_node.alias = "alias1"
        mock_node.datatype = "string"
        mock_factory.return_value.get_instance.return_value = MagicMock()
        mock_node_model.objects.filter.return_value.first.return_value = mock_node

        cnw = MagicMock()
        cnw.node.alias = "alias1"
        mock_cnw.objects.filter.return_value.filter.return_value.all.return_value = [
            cnw
        ]

        AbstractPrimaryDescriptors().initialize()

        self.assertIn("alias1", AbstractPrimaryDescriptors._html_nodes)

    @patch(
        "bcgov_arches_common.functions.abstract_primary_descriptors.models.CardXNodeXWidget"
    )
    @patch("bcgov_arches_common.functions.abstract_primary_descriptors.models.Node")
    @patch("bcgov_arches_common.functions.abstract_primary_descriptors.DataTypeFactory")
    def test_html_nodes_empty_when_no_rich_text_widgets(
        self, mock_factory, mock_node_model, mock_cnw
    ):
        mock_node = MagicMock()
        mock_node.alias = "alias1"
        mock_node.datatype = "string"
        mock_factory.return_value.get_instance.return_value = MagicMock()
        mock_node_model.objects.filter.return_value.first.return_value = mock_node
        mock_cnw.objects.filter.return_value.filter.return_value.all.return_value = []

        AbstractPrimaryDescriptors().initialize()

        self.assertEqual(AbstractPrimaryDescriptors._html_nodes, [])


class GetValuesInOrderIsHtmlTestCase(TestCase):
    """Tests that the is_html flag is correctly derived from _html_nodes and
    forwarded to _format_value in get_values_in_order."""

    def setUp(self):
        node = MagicMock()
        node.alias = "alias1"
        node.name = "Node 1"
        AbstractPrimaryDescriptors._nodes = {"alias1": node}
        AbstractPrimaryDescriptors._datatypes = {}
        self.config = {"first_only": False, "show_name": True}

    @patch.object(AbstractPrimaryDescriptors, "_format_value")
    @patch.object(AbstractPrimaryDescriptors, "_get_value_from_node")
    def test_html_node_passes_is_html_true(self, mock_get_value, mock_format):
        AbstractPrimaryDescriptors._html_nodes = ["alias1"]
        mock_get_value.return_value = "a value"
        mock_format.return_value = "formatted"

        AbstractPrimaryDescriptors().get_values_in_order(
            aliases=["alias1"], config=self.config, resource="res-id"
        )

        self.assertTrue(mock_format.call_args[0][3])

    @patch.object(AbstractPrimaryDescriptors, "_format_value")
    @patch.object(AbstractPrimaryDescriptors, "_get_value_from_node")
    def test_non_html_node_passes_is_html_false(self, mock_get_value, mock_format):
        AbstractPrimaryDescriptors._html_nodes = []
        mock_get_value.return_value = "a value"
        mock_format.return_value = "formatted"

        AbstractPrimaryDescriptors().get_values_in_order(
            aliases=["alias1"], config=self.config, resource="res-id"
        )

        self.assertFalse(mock_format.call_args[0][3])

    @patch.object(AbstractPrimaryDescriptors, "_get_value_from_node")
    def test_first_only_stops_after_first_matching_value(self, mock_get_value):
        node2 = MagicMock()
        node2.alias = "alias2"
        node2.name = "Node 2"
        AbstractPrimaryDescriptors._nodes["alias2"] = node2
        AbstractPrimaryDescriptors._html_nodes = []
        mock_get_value.side_effect = ["first value", "second value"]

        result = AbstractPrimaryDescriptors().get_values_in_order(
            aliases=["alias1", "alias2"],
            config={"first_only": True, "show_name": False},
            resource="res-id",
        )

        self.assertEqual(result, "first value")
        mock_get_value.assert_called_once()
