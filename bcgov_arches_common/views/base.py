import urllib3
from django.conf import settings


class OutboundProxyMixin:
    def get_request_pool_manager(self, timeout=30):
        if (
            hasattr(settings, "TILESERVER_OUTBOUND_PROXY")
            and settings.TILESERVER_OUTBOUND_PROXY
        ):
            return urllib3.ProxyManager(
                settings.TILESERVER_OUTBOUND_PROXY, timeout=timeout
            )
        else:
            return urllib3.PoolManager(timeout=timeout)
