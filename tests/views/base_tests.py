import urllib3
from unittest.mock import patch, MagicMock

from django.test import TestCase

from bcgov_arches_common.views.base import OutboundProxyMixin

MODULE = "bcgov_arches_common.views.base"


class OutboundProxyMixinTests(TestCase):
    def setUp(self):
        self.mixin = OutboundProxyMixin()

    @patch(f"{MODULE}.urllib3.ProxyManager")
    @patch(f"{MODULE}.urllib3.PoolManager")
    def test_returns_pool_manager_when_setting_absent(
        self, mock_pool_manager, mock_proxy_manager
    ):
        """No TILESERVER_OUTBOUND_PROXY attribute → falls back to PoolManager."""
        with self.settings():
            # Remove attribute if present
            from django.conf import settings as django_settings

            if hasattr(django_settings, "TILESERVER_OUTBOUND_PROXY"):
                del django_settings.TILESERVER_OUTBOUND_PROXY

            result = self.mixin.get_request_pool_manager()

        mock_pool_manager.assert_called_once_with(timeout=30)
        mock_proxy_manager.assert_not_called()
        self.assertEqual(result, mock_pool_manager.return_value)

    @patch(f"{MODULE}.urllib3.ProxyManager")
    @patch(f"{MODULE}.urllib3.PoolManager")
    def test_returns_pool_manager_when_proxy_is_falsy(
        self, mock_pool_manager, mock_proxy_manager
    ):
        """TILESERVER_OUTBOUND_PROXY set to None/empty → PoolManager."""
        with self.settings(TILESERVER_OUTBOUND_PROXY=None):
            result = self.mixin.get_request_pool_manager()

        mock_pool_manager.assert_called_once_with(timeout=30)
        mock_proxy_manager.assert_not_called()
        self.assertEqual(result, mock_pool_manager.return_value)

    @patch(f"{MODULE}.urllib3.ProxyManager")
    @patch(f"{MODULE}.urllib3.PoolManager")
    def test_returns_proxy_manager_when_proxy_configured(
        self, mock_pool_manager, mock_proxy_manager
    ):
        """TILESERVER_OUTBOUND_PROXY set → ProxyManager with proxy URL."""
        proxy_url = "http://proxy.example.com:3128"
        with self.settings(TILESERVER_OUTBOUND_PROXY=proxy_url):
            result = self.mixin.get_request_pool_manager()

        mock_proxy_manager.assert_called_once_with(proxy_url, timeout=30)
        mock_pool_manager.assert_not_called()
        self.assertEqual(result, mock_proxy_manager.return_value)

    @patch(f"{MODULE}.urllib3.ProxyManager")
    @patch(f"{MODULE}.urllib3.PoolManager")
    def test_custom_timeout_passed_to_pool_manager(
        self, mock_pool_manager, mock_proxy_manager
    ):
        """Custom timeout is forwarded to PoolManager."""
        with self.settings(TILESERVER_OUTBOUND_PROXY=None):
            self.mixin.get_request_pool_manager(timeout=60)

        mock_pool_manager.assert_called_once_with(timeout=60)

    @patch(f"{MODULE}.urllib3.ProxyManager")
    @patch(f"{MODULE}.urllib3.PoolManager")
    def test_custom_timeout_passed_to_proxy_manager(
        self, mock_pool_manager, mock_proxy_manager
    ):
        """Custom timeout is forwarded to ProxyManager."""
        proxy_url = "http://proxy.example.com:3128"
        with self.settings(TILESERVER_OUTBOUND_PROXY=proxy_url):
            self.mixin.get_request_pool_manager(timeout=10)

        mock_proxy_manager.assert_called_once_with(proxy_url, timeout=10)
