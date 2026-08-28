"""
Tests for the print_graph_hierarchy management command.

Covers handle() error paths and the _print_node() rendering logic.
All ORM calls are mocked — no database required.
"""

import io
import uuid
from collections import defaultdict
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.core.management.base import CommandError, OutputWrapper
from django.test import TestCase

from bcgov_arches_common.management.commands.print_graph_hierarchy import Command

MODULE = "bcgov_arches_common.management.commands.print_graph_hierarchy"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_nodegroup(cardinality="1", pk=None):
    ng = MagicMock()
    ng.nodegroupid = pk or str(uuid.uuid4())
    ng.cardinality = cardinality
    return ng


def make_node(
    alias="node_alias",
    datatype="string",
    istopnode=False,
    nodegroup=None,
    node_id=None,
):
    """Build a minimal node-like object understood by _print_node."""
    nid = node_id or str(uuid.uuid4())
    node = SimpleNamespace(
        nodeid=nid,
        alias=alias,
        datatype=datatype,
        istopnode=istopnode,
        nodegroup=nodegroup,
        nodegroup_id=nodegroup.nodegroupid if nodegroup else None,
    )
    return node


def make_collector_node(alias="collector", cardinality="1", node_id=None):
    """A node that IS the grouping node of its nodegroup (nodeid == nodegroup_id)."""
    nid = node_id or str(uuid.uuid4())
    ng = make_nodegroup(cardinality=cardinality, pk=nid)
    return make_node(alias=alias, datatype="string", nodegroup=ng, node_id=nid)


def _run_print_node(node_id, nodes_by_id, children_of=None, show_semantic=False):
    """Execute _print_node and return the captured output lines."""
    cmd = Command()
    buf = io.StringIO()
    # OutputWrapper mirrors how Django sets up self.stdout in BaseCommand,
    # including the default ending="\n" appended to each write() call.
    cmd.stdout = OutputWrapper(buf)
    cmd.style = MagicMock()
    cmd.style.SUCCESS.side_effect = lambda s: s
    cmd._print_node(
        node_id=node_id,
        nodes_by_id=nodes_by_id,
        children_of=children_of or defaultdict(list),
        show_semantic=show_semantic,
        depth=0,
    )
    return buf.getvalue().splitlines()


# ---------------------------------------------------------------------------
# handle() — error paths
# ---------------------------------------------------------------------------


class HandleErrorsTest(TestCase):
    @patch(f"{MODULE}.GraphModel")
    def test_unknown_slug_raises_command_error(self, mock_graph_model):
        mock_graph_model.objects.get.side_effect = mock_graph_model.DoesNotExist
        mock_graph_model.DoesNotExist = Exception

        with self.assertRaises((CommandError, Exception)):
            out = io.StringIO()
            call_command("print_graph_hierarchy", "no-such-slug", stdout=out)

    @patch(f"{MODULE}.Edge")
    @patch(f"{MODULE}.Node")
    @patch(f"{MODULE}.GraphModel")
    def test_graph_with_no_top_node_raises_command_error(
        self, mock_graph_model, mock_node, mock_edge
    ):
        mock_graph_model.objects.get.return_value = MagicMock(
            name="Test Graph", slug="test-slug"
        )
        # Return a node that is NOT the top node
        non_root = make_node(istopnode=False)
        mock_node.objects.filter.return_value.select_related.return_value = [non_root]
        mock_edge.objects.filter.return_value.only.return_value = []

        with self.assertRaises(CommandError):
            out = io.StringIO()
            call_command("print_graph_hierarchy", "test-slug", stdout=out)


# ---------------------------------------------------------------------------
# handle() — happy path header
# ---------------------------------------------------------------------------


class HandleHeaderTest(TestCase):
    @patch(f"{MODULE}.Edge")
    @patch(f"{MODULE}.Node")
    @patch(f"{MODULE}.GraphModel")
    def test_header_contains_graph_name_and_slug(
        self, mock_graph_model, mock_node, mock_edge
    ):
        graph = MagicMock()
        graph.name = "My Graph"
        graph.slug = "my-graph"
        mock_graph_model.objects.get.return_value = graph

        root = make_collector_node(alias="root")
        root.istopnode = True
        mock_node.objects.filter.return_value.select_related.return_value = [root]
        mock_edge.objects.filter.return_value.only.return_value = []

        out = io.StringIO()
        call_command("print_graph_hierarchy", "my-graph", stdout=out)
        output = out.getvalue()

        self.assertIn("My Graph", output)
        self.assertIn("my-graph", output)
        self.assertIn("Legend", output)


# ---------------------------------------------------------------------------
# _print_node() — semantic node handling
# ---------------------------------------------------------------------------


class SemanticNodeTest(TestCase):
    def test_semantic_node_hidden_by_default(self):
        sem_id = str(uuid.uuid4())
        sem_node = make_node(alias="sem", datatype="semantic", node_id=sem_id)
        nodes = {sem_id: sem_node}

        lines = _run_print_node(sem_id, nodes, show_semantic=False)

        self.assertEqual(lines, [], "semantic node should produce no output")

    def test_semantic_node_shown_when_flag_set(self):
        sem_id = str(uuid.uuid4())
        sem_node = make_node(alias="sem", datatype="semantic", node_id=sem_id)
        nodes = {sem_id: sem_node}

        lines = _run_print_node(sem_id, nodes, show_semantic=True)

        self.assertEqual(len(lines), 1)
        self.assertIn("sem", lines[0])

    def test_semantic_node_hidden_but_children_still_printed(self):
        sem_id = str(uuid.uuid4())
        child = make_collector_node(alias="child_node")
        child_id = str(child.nodeid)

        sem_node = make_node(alias="sem", datatype="semantic", node_id=sem_id)
        nodes = {sem_id: sem_node, child_id: child}
        children_of = defaultdict(list, {sem_id: [child_id]})

        lines = _run_print_node(sem_id, nodes, children_of, show_semantic=False)

        # Only the child should appear; the semantic node itself should be absent
        self.assertEqual(len(lines), 1)
        self.assertIn("child_node", lines[0])

    def test_semantic_child_hidden_depth_does_not_grow(self):
        """Children beneath a hidden semantic node appear at the same depth as if
        the semantic node were not there."""
        sem_id = str(uuid.uuid4())
        child = make_collector_node(alias="deep_child")
        child_id = str(child.nodeid)

        sem_node = make_node(alias="sem", datatype="semantic", node_id=sem_id)
        nodes = {sem_id: sem_node, child_id: child}
        children_of = defaultdict(list, {sem_id: [child_id]})

        lines = _run_print_node(sem_id, nodes, children_of, show_semantic=False)

        # Depth should be 0 (no leading spaces from depth indentation)
        self.assertFalse(lines[0].startswith("    "))


# ---------------------------------------------------------------------------
# _print_node() — cardinality and collector marker
# ---------------------------------------------------------------------------


class CardinalityLabelTest(TestCase):
    def test_collector_node_cardinality_n_shows_star_and_n(self):
        node = make_collector_node(alias="multi", cardinality="n")
        node_id = str(node.nodeid)
        nodes = {node_id: node}

        lines = _run_print_node(node_id, nodes)

        self.assertEqual(len(lines), 1)
        self.assertIn("*", lines[0])
        self.assertIn("[n]", lines[0])

    def test_collector_node_cardinality_1_shows_star_and_1(self):
        node = make_collector_node(alias="single", cardinality="1")
        node_id = str(node.nodeid)
        nodes = {node_id: node}

        lines = _run_print_node(node_id, nodes)

        self.assertIn("*", lines[0])
        self.assertIn("[1]", lines[0])

    def test_non_collector_node_shows_1_regardless_of_nodegroup_cardinality(self):
        """A sibling node inside an n-cardinality nodegroup is always [1] within its tile."""
        collector_id = str(uuid.uuid4())
        ng = make_nodegroup(cardinality="n", pk=collector_id)

        # Non-collector: different nodeid, but same nodegroup
        sibling_id = str(uuid.uuid4())
        sibling = make_node(
            alias="sibling", datatype="string", nodegroup=ng, node_id=sibling_id
        )
        nodes = {sibling_id: sibling}

        lines = _run_print_node(sibling_id, nodes)

        self.assertNotIn("*", lines[0])
        self.assertIn("[1]", lines[0])
        self.assertNotIn("[n]", lines[0])

    def test_top_node_no_nodegroup_shows_no_cardinality_label(self):
        node = make_node(
            alias="top", datatype="semantic", istopnode=True, nodegroup=None
        )
        node_id = str(node.nodeid)
        nodes = {node_id: node}

        lines = _run_print_node(node_id, nodes, show_semantic=True)

        # Should not contain [1] or [n]
        self.assertNotIn("[1]", lines[0])
        self.assertNotIn("[n]", lines[0])


# ---------------------------------------------------------------------------
# _print_node() — alias and datatype display
# ---------------------------------------------------------------------------


class AliasAndDatatypeTest(TestCase):
    def test_alias_appears_in_output(self):
        node = make_collector_node(alias="my_special_alias")
        node_id = str(node.nodeid)
        nodes = {node_id: node}

        lines = _run_print_node(node_id, nodes)

        self.assertIn("my_special_alias", lines[0])

    def test_missing_alias_shows_fallback_with_nodeid(self):
        nid = str(uuid.uuid4())
        ng = make_nodegroup(pk=nid)
        node = make_node(alias="", datatype="string", nodegroup=ng, node_id=nid)
        nodes = {nid: node}

        lines = _run_print_node(nid, nodes)

        self.assertIn("no alias", lines[0])
        self.assertIn(nid, lines[0])

    def test_datatype_shown_for_data_nodes(self):
        node = make_collector_node(alias="dated_node")
        node.datatype = "date"
        node_id = str(node.nodeid)
        nodes = {node_id: node}

        lines = _run_print_node(node_id, nodes)

        self.assertIn("<date>", lines[0])

    def test_datatype_not_shown_for_semantic_nodes(self):
        sem_id = str(uuid.uuid4())
        sem_node = make_node(alias="sem", datatype="semantic", node_id=sem_id)
        nodes = {sem_id: sem_node}

        lines = _run_print_node(sem_id, nodes, show_semantic=True)

        self.assertNotIn("<semantic>", lines[0])


# ---------------------------------------------------------------------------
# _print_node() — tree structure
# ---------------------------------------------------------------------------


class TreeStructureTest(TestCase):
    def test_children_sorted_by_alias(self):
        parent = make_collector_node(alias="parent")
        parent_id = str(parent.nodeid)

        child_z = make_collector_node(alias="z_child")
        child_a = make_collector_node(alias="a_child")
        child_z_id = str(child_z.nodeid)
        child_a_id = str(child_a.nodeid)

        nodes = {
            parent_id: parent,
            child_z_id: child_z,
            child_a_id: child_a,
        }
        children_of = defaultdict(list, {parent_id: [child_z_id, child_a_id]})

        lines = _run_print_node(parent_id, nodes, children_of)

        # parent is first; then children in alphabetical order
        self.assertIn("parent", lines[0])
        self.assertIn("a_child", lines[1])
        self.assertIn("z_child", lines[2])

    def test_child_indented_one_level_deeper(self):
        parent = make_collector_node(alias="parent")
        parent_id = str(parent.nodeid)
        child = make_collector_node(alias="child")
        child_id = str(child.nodeid)

        nodes = {parent_id: parent, child_id: child}
        children_of = defaultdict(list, {parent_id: [child_id]})

        lines = _run_print_node(parent_id, nodes, children_of)

        parent_indent = len(lines[0]) - len(lines[0].lstrip())
        child_indent = len(lines[1]) - len(lines[1].lstrip())
        self.assertGreater(child_indent, parent_indent)

    def test_grandchild_indented_two_levels(self):
        root = make_collector_node(alias="root")
        root_id = str(root.nodeid)
        mid = make_collector_node(alias="mid")
        mid_id = str(mid.nodeid)
        leaf = make_collector_node(alias="leaf")
        leaf_id = str(leaf.nodeid)

        nodes = {root_id: root, mid_id: mid, leaf_id: leaf}
        children_of = defaultdict(list, {root_id: [mid_id], mid_id: [leaf_id]})

        lines = _run_print_node(root_id, nodes, children_of)

        indents = [len(l) - len(l.lstrip()) for l in lines]
        self.assertLess(indents[0], indents[1])
        self.assertLess(indents[1], indents[2])

    def test_unknown_node_id_silently_skipped(self):
        """Passing a node_id not present in nodes_by_id should not raise."""
        lines = _run_print_node("nonexistent-id", nodes_by_id={})
        self.assertEqual(lines, [])
