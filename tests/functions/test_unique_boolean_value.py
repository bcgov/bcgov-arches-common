from unittest.mock import MagicMock, patch
from django.test import TestCase

from arches.app.models.tile import TileValidationError

from bcgov_arches_common.functions.unique_boolean_value import UniqueBooleanValue

NODE_ID = "aaaaaaaa-0000-0000-0000-000000000001"
OTHER_TILE_ID = "bbbbbbbb-0000-0000-0000-000000000001"
USER_ID = "42"


def _make_tile(pk=OTHER_TILE_ID, data=None, provisionaledits=None):
    tile = MagicMock()
    tile.pk = pk
    tile.data = data if data is not None else {NODE_ID: True}
    tile.provisionaledits = provisionaledits
    return tile


def _make_request(user_id=USER_ID, pending=None):
    request = MagicMock()
    request.user.id = user_id
    if pending is not None:
        request._pending_tile_data = pending
    elif hasattr(request, "_pending_tile_data"):
        del request._pending_tile_data
    return request


class GetEffectiveValueTests(TestCase):
    """Unit tests for UniqueBooleanValue._get_effective_value."""

    def test_returns_authoritative_data_when_no_request_no_provisional(self):
        tile = _make_tile(data={NODE_ID: True})
        result = UniqueBooleanValue._get_effective_value(tile, NODE_ID, USER_ID)
        self.assertTrue(result)

    def test_returns_authoritative_data_when_request_is_none(self):
        tile = _make_tile(data={NODE_ID: True})
        result = UniqueBooleanValue._get_effective_value(
            tile, NODE_ID, USER_ID, request=None
        )
        self.assertTrue(result)

    def test_returns_none_when_node_absent_from_data(self):
        tile = _make_tile(data={})
        result = UniqueBooleanValue._get_effective_value(tile, NODE_ID, USER_ID)
        self.assertIsNone(result)

    # --- Priority 1: pending stash ---

    def test_pending_stash_overrides_authoritative_true(self):
        """Tile has True in DB but is being cleared to False in the same batch."""
        tile = _make_tile(data={NODE_ID: True})
        request = MagicMock()
        request._pending_tile_data = {OTHER_TILE_ID: {NODE_ID: False}}
        result = UniqueBooleanValue._get_effective_value(
            tile, NODE_ID, USER_ID, request
        )
        self.assertFalse(result)

    def test_pending_stash_overrides_provisional_edit(self):
        """Pending stash takes priority over the user's existing provisional edit."""
        tile = _make_tile(
            data={NODE_ID: False},
            provisionaledits={USER_ID: {"value": {NODE_ID: True}}},
        )
        request = MagicMock()
        request._pending_tile_data = {OTHER_TILE_ID: {NODE_ID: False}}
        result = UniqueBooleanValue._get_effective_value(
            tile, NODE_ID, USER_ID, request
        )
        self.assertFalse(result)

    def test_pending_stash_absent_falls_through(self):
        """When the tile is not in the stash, fall through to provisional/authoritative."""
        tile = _make_tile(data={NODE_ID: True})
        request = MagicMock()
        request._pending_tile_data = {}  # stash exists but tile not in it
        result = UniqueBooleanValue._get_effective_value(
            tile, NODE_ID, USER_ID, request
        )
        self.assertTrue(result)

    def test_no_pending_tile_data_attr_falls_through(self):
        """When request has no _pending_tile_data attribute, fall through."""
        tile = _make_tile(data={NODE_ID: True})
        request = MagicMock(spec=[])  # no attributes at all
        result = UniqueBooleanValue._get_effective_value(
            tile, NODE_ID, USER_ID, request
        )
        self.assertTrue(result)

    # --- Priority 2: current user's provisional edit ---

    def test_returns_current_users_provisional_edit(self):
        tile = _make_tile(
            data={NODE_ID: True},
            provisionaledits={USER_ID: {"value": {NODE_ID: False}}},
        )
        result = UniqueBooleanValue._get_effective_value(tile, NODE_ID, USER_ID)
        self.assertFalse(result)

    def test_ignores_other_users_provisional_edit(self):
        """Only the current user's provisional edit is consulted."""
        tile = _make_tile(
            data={NODE_ID: True},
            provisionaledits={"999": {"value": {NODE_ID: False}}},
        )
        result = UniqueBooleanValue._get_effective_value(tile, NODE_ID, USER_ID)
        # Falls through to authoritative data (True) because user_id "42" has no edit.
        self.assertTrue(result)

    def test_provisional_edit_missing_node_falls_through_to_data(self):
        """Provisional edit exists but doesn't include the node; use authoritative."""
        tile = _make_tile(
            data={NODE_ID: True},
            provisionaledits={USER_ID: {"value": {}}},
        )
        result = UniqueBooleanValue._get_effective_value(tile, NODE_ID, USER_ID)
        self.assertTrue(result)

    def test_returns_authoritative_when_user_id_is_none(self):
        tile = _make_tile(
            data={NODE_ID: True},
            provisionaledits={USER_ID: {"value": {NODE_ID: False}}},
        )
        result = UniqueBooleanValue._get_effective_value(tile, NODE_ID, user_id=None)
        self.assertTrue(result)


class SaveTests(TestCase):
    """Integration-style tests for UniqueBooleanValue.save()."""

    def _make_function(self, node_id=NODE_ID, unique_value=True, nodegroup_id="ng-1"):
        func = UniqueBooleanValue()
        func.config = {
            "node_id": node_id,
            "unique_value": unique_value,
            "triggering_nodegroups": [nodegroup_id],
        }
        return func

    def _make_current_tile(self, node_value=True, tileid="current-tile-id"):
        tile = MagicMock()
        tile.data = {NODE_ID: node_value}
        tile.tileid = tileid
        tile.resourceinstance = MagicMock()
        return tile

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_no_conflict_when_value_is_false(self, mock_tile_model):
        """save() is a no-op when the incoming value is False (doesn't match unique_value=True)."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=False)
        request = _make_request()

        func.save(tile, request, {})

        mock_tile_model.objects.filter.assert_not_called()

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_no_conflict_when_no_other_tiles(self, mock_tile_model):
        """save() does not raise when no other tiles exist for the nodegroup."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=True)
        mock_tile_model.objects.filter.return_value = []
        request = _make_request()

        func.save(tile, request, {})  # should not raise

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.Node")
    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_raises_when_other_tile_is_authoritative_true(
        self, mock_tile_model, mock_node
    ):
        """Raises TileValidationError when another tile has True in authoritative data."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=True)

        other = _make_tile(data={NODE_ID: True}, provisionaledits=None)
        mock_tile_model.objects.filter.return_value = [other]
        mock_node.objects.get.return_value.name = "primary_image"

        request = _make_request(pending={})  # empty stash — no in-flight changes

        with self.assertRaises(TileValidationError):
            func.save(tile, request, {})

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.Node")
    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_raises_when_other_tile_has_provisional_true(
        self, mock_tile_model, mock_node
    ):
        """Raises when another tile's provisional edit (same user) is True."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=True)

        other = _make_tile(
            data={NODE_ID: False},
            provisionaledits={USER_ID: {"value": {NODE_ID: True}}},
        )
        mock_tile_model.objects.filter.return_value = [other]
        mock_node.objects.get.return_value.name = "primary_image"

        request = _make_request(pending={})

        with self.assertRaises(TileValidationError):
            func.save(tile, request, {})

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_no_conflict_when_other_tile_cleared_in_pending_stash(
        self, mock_tile_model
    ):
        """No error when the other True tile is being set to False in the same batch."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=True)

        other = _make_tile(
            pk=OTHER_TILE_ID, data={NODE_ID: True}, provisionaledits=None
        )
        mock_tile_model.objects.filter.return_value = [other]

        # The same-batch stash shows the other tile will become False.
        request = _make_request(pending={OTHER_TILE_ID: {NODE_ID: False}})

        func.save(tile, request, {})  # should not raise

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_no_conflict_when_other_tile_cleared_via_provisional_edit(
        self, mock_tile_model
    ):
        """No error when the other tile's existing provisional edit already shows False."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=True)

        other = _make_tile(
            data={NODE_ID: True},
            provisionaledits={USER_ID: {"value": {NODE_ID: False}}},
        )
        mock_tile_model.objects.filter.return_value = [other]

        request = _make_request(pending={})  # no in-flight stash entry for other tile

        func.save(tile, request, {})  # should not raise

    @patch("bcgov_arches_common.functions.unique_boolean_value.models.Node")
    @patch("bcgov_arches_common.functions.unique_boolean_value.models.TileModel")
    def test_error_message_contains_node_name(self, mock_tile_model, mock_node):
        """The TileValidationError message includes the node's name."""
        func = self._make_function()
        tile = self._make_current_tile(node_value=True)

        other = _make_tile(data={NODE_ID: True}, provisionaledits=None)
        mock_tile_model.objects.filter.return_value = [other]
        mock_node.objects.get.return_value.name = "primary_image"

        request = _make_request(pending={})

        with self.assertRaises(TileValidationError) as ctx:
            func.save(tile, request, {})

        self.assertIn("primary_image", ctx.exception.message)
