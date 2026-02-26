from django.test import TestCase
from unittest.mock import patch, MagicMock
from django.conf import settings
import urllib3
from bcgov_arches_common.views.outbound_proxy_mixin import OutboundProxyMixin


class OutboundProxyMixinTests(TestCase):
    def setUp(self):
        """
        Set up the test environment. This method will run before every test.
        """
        self.mixin = OutboundProxyMixin()

    @patch("bcgov_arches_common.views.outbound_proxy_mixin.urllib3.ProxyManager")
    @patch("bcgov_arches_common.views.outbound_proxy_mixin.urllib3.PoolManager")
    def test_get_http_connection_with_outbound_proxy(
        self, mock_pool_manager, mock_proxy_manager
    ):
        """
        Test that get_http_connection uses ProxyManager when an outbound proxy is specified.
        """
        settings.TILESERVER_OUTBOUND_PROXY = "http://example-proxy.com"

        # Call the method
        connection = self.mixin.get_http_connection(use_outbound_proxy=True)

        # Assert that ProxyManager was called with the correct argument
        mock_proxy_manager.assert_called_once_with(settings.TILESERVER_OUTBOUND_PROXY)
        mock_pool_manager.assert_not_called()

        # Assert that the returned connection is a ProxyManager instance
        self.assertEqual(connection, mock_proxy_manager.return_value)

    @patch("bcgov_arches_common.views.outbound_proxy_mixin.urllib3.PoolManager")
    @patch("bcgov_arches_common.views.outbound_proxy_mixin.urllib3.ProxyManager")
    def test_get_http_connection_without_outbound_proxy(
        self, mock_proxy_manager, mock_pool_manager
    ):
        """
        Test that get_http_connection uses PoolManager when no outbound proxy is specified.
        """
        # Ensure TILESERVER_OUTBOUND_PROXY is not set
        settings.TILESERVER_OUTBOUND_PROXY = None

        # Call the method
        connection = self.mixin.get_http_connection(use_outbound_proxy=False)

        # Assert that PoolManager was called and ProxyManager was not
        mock_pool_manager.assert_called_once()
        mock_proxy_manager.assert_not_called()

        # Assert that the returned connection is a PoolManager instance
        self.assertEqual(connection, mock_pool_manager.return_value)

    @patch("bcgov_arches_common.views.outbound_proxy_mixin.urllib3.PoolManager")
    @patch("bcgov_arches_common.views.outbound_proxy_mixin.urllib3.ProxyManager")
    def test_get_http_connection_with_proxy_config_disabled(
        self, mock_proxy_manager, mock_pool_manager
    ):
        """
        Test that get_http_connection ignores outbound proxy settings if use_outbound_proxy is False.
        """
        settings.TILESERVER_OUTBOUND_PROXY = "http://example-proxy.com"

        # Call the method
        connection = self.mixin.get_http_connection(use_outbound_proxy=False)

        # Ensure PoolManager was called instead of ProxyManager
        mock_pool_manager.assert_called_once()
        mock_proxy_manager.assert_not_called()

        # Assert the connection is a PoolManager instance
        self.assertEqual(connection, mock_pool_manager.return_value)
