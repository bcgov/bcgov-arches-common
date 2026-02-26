# %%
import urllib3
from django.conf import settings


class OutboundProxyMixin:
    """
    Mixin that adds outbound proxy functionality to a view.
    This can be used by proxy views to route requests through an external proxy.
    """

    def get_http_connection(self, use_outbound_proxy=False):
        """
        Returns the appropriate HTTP connection based on whether
        to use the outbound proxy or not.
        """
        if (
            use_outbound_proxy
            and hasattr(settings, "TILESERVER_OUTBOUND_PROXY")
            and settings.TILESERVER_OUTBOUND_PROXY
        ):
            # Return proxy connection
            return urllib3.ProxyManager(settings.TILESERVER_OUTBOUND_PROXY)
        else:
            # Return regular connection
            return urllib3.PoolManager()
