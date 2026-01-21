from arches.app.views.map import TileserverProxyView
from django.conf import settings
from bcgov_arches_common.views.outbound_proxy_mixin import OutboundProxyMixin


class BCTileserverProxyView(TileserverProxyView, OutboundProxyMixin):
    """
    Subclass of the TileserverProxyView that has multiple upstream servers.
        - the BC_TILESERVER_URLS is a dict with source->upstream URL mapping and outbound proxy configuration
        - the request URL must have the source parameter set. If not set it defaults to "openmaps"
    """

    DEFAULT_SOURCE = "openmaps"
    DEFAULT_CONFIG = {
        "url": getattr(settings, "TILESERVER_URL", "https://openmaps.gov.bc.ca/"),
        "use_outbound_proxy": False,
    }

    @property
    def upstream_urls(self):
        """
        Get upstream URLs from settings, ensuring the default source is always available.
        """
        # Get configuration from settings or empty dict if not defined
        urls = getattr(settings, "BC_TILESERVER_URLS", {})

        # Ensure default source exists
        if self.DEFAULT_SOURCE not in urls:
            urls[self.DEFAULT_SOURCE] = self.DEFAULT_CONFIG

        return urls

    def get_request_headers(self):
        proxy_source = self.request.GET.get("source", "")

        # Get all available sources
        upstream_urls = self.upstream_urls

        # Get source configuration with fallback to default source
        source_config = (
            upstream_urls[proxy_source]
            if proxy_source in upstream_urls
            else upstream_urls[self.DEFAULT_SOURCE]
        )

        # Update upstream URL from configuration
        self.upstream = source_config.get("url")

        # Configure the HTTP connection based on proxy setting
        self.http = self.get_http_connection(
            use_outbound_proxy=source_config.get("use_outbound_proxy", False)
        )

        return super(BCTileserverProxyView, self).get_request_headers()

    def dispatch(self, request, *args, **kwargs):
        # When hitting /bctileserver/ there is no <path:path> kwarg.
        # Normalize to empty string so upstream becomes "/" not "None".
        kwargs["path"] = kwargs.get("path", "")
        return super().dispatch(request, *args, **kwargs)
