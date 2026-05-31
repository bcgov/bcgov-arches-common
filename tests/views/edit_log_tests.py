import datetime as dt
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.client import RequestFactory
from django.utils.timezone import make_aware

from bcgov_arches_common.views.api.edit_log import ResourceEditLogView

MODULE = ResourceEditLogView.__module__


def _mk_editlog(
    *,
    ts=None,
    edittype="UPDATE",
    user_username=None,
    user_firstname=None,
    user_lastname=None,
    user_email=None,
    userid=None,
    tile_id=None,
    nodegroup_id=None,
    transaction_id=None,
):
    return SimpleNamespace(
        timestamp=ts or make_aware(dt.datetime(2024, 1, 2, 3, 4, 5)),
        edittype=edittype,
        user_username=user_username,
        user_firstname=user_firstname,
        user_lastname=user_lastname,
        user_email=user_email,
        userid=userid,
        tileinstanceid=tile_id,
        nodegroupid=nodegroup_id,
        transactionid=transaction_id,
    )


def _chain_first_returns(obj):
    qs = MagicMock()
    qs.order_by.return_value = qs
    qs.first.return_value = obj
    return qs


def _chain_values_first_returns(mapping):
    qs = MagicMock()
    qs.values.return_value = qs
    qs.first.return_value = mapping
    return qs


class ResourceEditLogViewTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = ResourceEditLogView.as_view()

    # -----------------------
    # _get_tile_modification
    # -----------------------
    @patch(f"{MODULE}.EditLog")
    def test_get_tile_modification_found_returns_formatted(self, mock_editlog):
        edit_log = _mk_editlog(
            user_username="brett",
            tile_id="t-1",
            transaction_id="tx-123",
            user_email="b@example.com",
        )
        mock_editlog.objects.filter.return_value = _chain_first_returns(edit_log)

        req = self.factory.get("/dummy?tile_id=t-1")
        resp = self.view(req, resource_id="res-1")
        resp.render()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["modified_by"], "brett")
        self.assertEqual(resp.data["tile_id"], "t-1")
        self.assertEqual(resp.data["transaction_id"], "tx-123")
        self.assertEqual(resp.data["user_email"], "b@example.com")
        self.assertIs(resp.data["is_system_edit"], False)

    @patch(f"{MODULE}.EditLog")
    def test_get_tile_modification_not_found(self, mock_editlog):
        mock_editlog.objects.filter.return_value = _chain_first_returns(None)

        req = self.factory.get("/dummy?tile_id=t-404")
        resp = self.view(req, resource_id="res-1")
        resp.render()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["tile_id"], "t-404")
        self.assertIsNone(resp.data["modified_on"])
        self.assertIn("No modifications found", resp.data["error"])

    # --------------------------
    # _get_resource_modification
    # --------------------------
    @patch(f"{MODULE}.EditLog")
    def test_get_resource_modification_resolves_user_when_missing_display_fields(
        self, mock_editlog
    ):
        User = get_user_model()
        user = User.objects.create_user(
            username="qed",
            password="x",
            first_name="Brett",
            last_name="Ferguson",
            email="brett@example.com",
        )

        edit_log = _mk_editlog(userid=str(user.id), user_email="brett@example.com")
        mock_editlog.objects.filter.return_value = _chain_first_returns(edit_log)

        req = self.factory.get("/dummy")
        resp = self.view(req, resource_id="res-1")
        resp.render()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["modified_by"], "Brett Ferguson")
        self.assertIs(resp.data["is_system_edit"], False)

    # --------------------------------
    # _get_nodegroup_modification path
    # --------------------------------
    @patch(f"{MODULE}.Node")
    @patch(f"{MODULE}.EditLog")
    @patch(f"{MODULE}.TileModel")
    def test_get_nodegroup_modification_with_children_and_alias(
        self, mock_tile, mock_editlog, mock_node
    ):
        # parent tiles
        parent_qs = MagicMock()
        parent_qs.values_list.return_value = ["pt-1"]
        mock_tile.objects.filter.return_value = parent_qs

        # child nodegroups (distinct)
        children_qs = MagicMock()
        children_values_qs = MagicMock()
        children_values_qs.distinct.return_value = ["ng-child-1", "ng-child-2"]
        children_qs.values_list.return_value = children_values_qs
        # Two sequential TileModel.objects.filter calls → parent first, then children
        mock_tile.objects.filter.side_effect = [parent_qs, children_qs]

        # EditLog found for one of the nodegroups
        edit_log = _mk_editlog(nodegroup_id="ng-child-1")
        mock_editlog.objects.filter.return_value = _chain_first_returns(edit_log)

        # Alias lookup for the edit_log.nodegroupid
        mock_node.objects.filter.return_value = _chain_values_first_returns(
            {"alias": "Child Alias"}
        )

        req = self.factory.get("/dummy?nodegroup_id=ng-parent")
        resp = self.view(req, resource_id="res-1")
        resp.render()

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["nodegroup_id"], "ng-child-1")
        self.assertEqual(resp.data["nodegroup_alias"], "Child Alias")
        self.assertIsNotNone(resp.data["modified_on"])

    # -----------------------------------------------------------
    # nodegroup alias resolution via get(...nodegroup_alias=...)
    # -----------------------------------------------------------
    @patch.object(
        ResourceEditLogView, "_get_nodegroup_id_from_alias", return_value="ng-42"
    )
    @patch.object(ResourceEditLogView, "_get_nodegroup_modification")
    def test_get_with_nodegroup_alias_resolves_and_uses_nodegroup(
        self, mock_ng_mod, mock_resolver
    ):
        mock_ng_mod.return_value = {
            "modified_on": "2024-01-02T03:04:05+00:00",
            "modified_by": "x",
        }

        req = self.factory.get("/dummy?graph_slug=graph&nodegroup_alias=core")
        resp = self.view(req, resource_id="res-9")
        resp.render()

        mock_resolver.assert_called_once_with("graph", "core")
        mock_ng_mod.assert_called_once_with("res-9", "ng-42")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["modified_by"], "x")

    @patch.object(
        ResourceEditLogView, "_get_nodegroup_id_from_alias", return_value=None
    )
    def test_get_with_nodegroup_alias_not_found_returns_error(self, _mock_resolver):
        req = self.factory.get("/dummy?graph_slug=graph&nodegroup_alias=missing")
        resp = self.view(req, resource_id="res-9")
        resp.render()

        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data["modified_on"])
        self.assertIn("Could not resolve nodegroup alias", resp.data["error"])

    # -------------------
    # Error handling path
    # -------------------
    @patch.object(
        ResourceEditLogView,
        "_get_resource_modification",
        side_effect=RuntimeError("boom"),
    )
    def test_get_catches_exceptions_and_returns_500(self, _mock):
        req = self.factory.get("/dummy")
        resp = self.view(req, resource_id="res-err")
        resp.render()

        self.assertEqual(resp.status_code, 500)
        self.assertIsNone(resp.data["modified_on"])
        self.assertIn("Error fetching audit log information", resp.data["error"])

    # -----------------------
    # System user name logic
    # -----------------------
    @patch(f"{MODULE}.EditLog")
    def test_system_user_name_inferred_when_no_user_fields(self, mock_editlog):
        cases = [
            ("IMPORT", "Data Import"),
            ("ETL Load", "Data Import"),
            ("Migration Step", "Data Migration"),
            ("CREATE", "System Import"),
            ("Reindex", "System (Reindex)"),
            (None, "System User"),
        ]

        for edittype, expected in cases:
            with self.subTest(edittype=edittype):
                edit_log = _mk_editlog(edittype=edittype, userid=None)
                mock_editlog.objects.filter.return_value = _chain_first_returns(
                    edit_log
                )

                req = self.factory.get("/dummy")
                resp = self.view(req, resource_id="res-1")
                resp.render()

                self.assertEqual(resp.status_code, 200)
                self.assertEqual(resp.data["modified_by"], expected)
                self.assertIs(resp.data["is_system_edit"], True)
