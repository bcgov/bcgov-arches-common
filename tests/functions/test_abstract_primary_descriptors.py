import pytest
from unittest.mock import patch, MagicMock

from bcgov_arches_common.functions.abstract_primary_descriptors import AbstractPrimaryDescriptors


@pytest.fixture
def mock_nodes():
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

    return {
        "alias1": node1,
        "alias2": node2,
    }


@pytest.fixture
def mock_datatype():
    datatype = MagicMock()
    datatype.get_display_value.side_effect = lambda tile, node: f"value_for_{node.alias}"
    return datatype


@pytest.fixture
def mock_config():
    return {"first_only": False, "show_name": True}


def reset_class_state():
    AbstractPrimaryDescriptors._graph_slug = "test_graph"
    AbstractPrimaryDescriptors._name_node_aliases = ["alias1"]
    AbstractPrimaryDescriptors._card_node_aliases = ["alias2"]
    AbstractPrimaryDescriptors._popup_node_aliases = []
    AbstractPrimaryDescriptors._nodes = {}
    AbstractPrimaryDescriptors._datatypes = {}
    AbstractPrimaryDescriptors._initialized = False


@patch("bcgov_arches_common.functions.abstract_primary_descriptors.models.Node")
@patch("bcgov_arches_common.functions.abstract_primary_descriptors.DataTypeFactory")
def test_initialize_sets_nodes_and_datatypes(mock_factory, mock_node_model, mock_nodes, mock_datatype):
    reset_class_state()

    # Setup mocks
    mock_factory.return_value.get_instance.return_value = mock_datatype
    mock_node_model.objects.filter.return_value.first.side_effect = lambda: mock_nodes["alias1"]

    AbstractPrimaryDescriptors.initialize()

    assert AbstractPrimaryDescriptors._nodes["alias1"] == mock_nodes["alias1"]
    assert AbstractPrimaryDescriptors._datatypes["alias1"] == mock_datatype
    assert AbstractPrimaryDescriptors._initialized is True


@patch("bcgov_arches_common.functions.abstract_primary_descriptors.models.TileModel")
def test_get_value_from_node_with_mock_tile(mock_tile_model, mock_nodes, mock_datatype):
    reset_class_state()
    AbstractPrimaryDescriptors._nodes = mock_nodes
    AbstractPrimaryDescriptors._datatypes = {"alias1": mock_datatype}

    mock_tile_model.objects.filter.return_value.all.return_value = [MagicMock(), MagicMock()]

    result = AbstractPrimaryDescriptors._get_value_from_node(
        node_alias="alias1", resourceinstanceid="res-123"
    )

    assert result == ["value_for_alias1", "value_for_alias1"]


@patch.object(AbstractPrimaryDescriptors, "_get_value_from_node")
def test_get_values_in_order(mock_get_value, mock_config):
    reset_class_state()
    AbstractPrimaryDescriptors._nodes = {
        "alias1": MagicMock(alias="alias1", name="Mock Node")
    }
    mock_get_value.return_value = "MockValue"

    descriptor = AbstractPrimaryDescriptors().get_values_in_order(
        aliases=["alias1"],
        config=mock_config,
        resource="res-001"
    )

    assert "Mock Node" in descriptor
    assert "MockValue" in descriptor
    assert descriptor.startswith("<div")


@patch.object(AbstractPrimaryDescriptors, "get_values_in_order")
def test_get_name_descriptor_delegates_to_get_values(mock_get_values):
    reset_class_state()
    AbstractPrimaryDescriptors._name_node_aliases = ["alias1"]
    mock_get_values.return_value = "NameDescriptor"

    result = AbstractPrimaryDescriptors().get_name_descriptor("res-001", {"first_only": True, "show_name": False}, None)
    assert result == "NameDescriptor"
    mock_get_values.assert_called_once()


@patch.object(AbstractPrimaryDescriptors, "get_values_in_order")
def test_get_search_card_descriptor_delegates_to_get_values(mock_get_values):
    reset_class_state()
    AbstractPrimaryDescriptors._card_node_aliases = ["alias2"]
    mock_get_values.return_value = "CardDescriptor"

    result = AbstractPrimaryDescriptors().get_search_card_descriptor("res-001", {"first_only": False, "show_name": True}, None)
    assert result == "CardDescriptor"
    mock_get_values.assert_called_once()


@patch.object(AbstractPrimaryDescriptors, "get_values_in_order")
def test_get_map_popup_descriptor_delegates_to_get_values(mock_get_values):
    reset_class_state()
    AbstractPrimaryDescriptors._popup_node_aliases = ["alias2"]
    mock_get_values.return_value = "PopupDescriptor"

    result = AbstractPrimaryDescriptors().get_map_popup_descriptor("res-001", {"first_only": False, "show_name": True}, None)
    assert result == "PopupDescriptor"
    mock_get_values.assert_called_once()


@patch.object(AbstractPrimaryDescriptors, "initialize")
@patch.object(AbstractPrimaryDescriptors, "get_name_descriptor")
@patch.object(AbstractPrimaryDescriptors, "get_search_card_descriptor")
@patch.object(AbstractPrimaryDescriptors, "get_map_popup_descriptor")
def test_get_primary_descriptor_from_nodes_dispatches_correctly(
    mock_map, mock_card, mock_name, mock_init
):
    reset_class_state()
    AbstractPrimaryDescriptors._initialized = False
    mock_name.return_value = "NameDesc"
    mock_card.return_value = "CardDesc"
    mock_map.return_value = "MapDesc"

    func = AbstractPrimaryDescriptors()

    # Test name descriptor
    result = func.get_primary_descriptor_from_nodes("res1", {}, descriptor="name")
    assert result == "NameDesc"

    # Test description
    result = func.get_primary_descriptor_from_nodes("res1", {}, descriptor="description")
    assert result == "CardDesc"

    # Test map_popup fallback
    result = func.get_primary_descriptor_from_nodes("res1", {}, descriptor="other")
    assert result == "MapDesc"

    assert mock_init.called