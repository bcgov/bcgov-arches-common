import time
import logging
from django.shortcuts import redirect
from authlib.integrations.requests_client import OAuth2Session
from django.conf import settings
from bcgov_arches_common.util.auth.token_store import save_token
from bcgov_arches_common.util.auth.oauth_session_control import log_user_out

logger = logging.getLogger(__name__)


def get_oauth_config():
    """Load OAuth config from settings dynamically."""
    return settings.AUTHLIB_OAUTH_CLIENTS["default"]


def bypass_auth(request):
    oauth_config = get_oauth_config()
    exempt_paths = oauth_config["urls"]["auth_exempt_pages"]

    request_source = (
        request.META.get("REMOTE_ADDR")
        if request.META.get("HTTP_X_FORWARDED_FOR") is None
        else request.META.get("HTTP_X_FORWARDED_FOR")
    )

    user_agent = request.META.get("HTTP_USER_AGENT", "")

    return request.path.rstrip("/") in exempt_paths or (
        request_source in settings.AUTH_BYPASS_HOSTS
        and user_agent.startswith("node-fetch/1.0")
    )


class OAuthTokenRefreshMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if bypass_auth(request):
            return self.get_response(request)

        oauth_config = get_oauth_config()
        home_page = oauth_config["urls"]["home_page"]
        unauthorized_page = oauth_config["urls"]["unauthorized_page"]
        auth_required = oauth_config.get("auth_required", True)

        if logger.isEnabledFor(logging.DEBUG):
            expiry_timestamp = request.session.get_expiry_date().timestamp()
            now = time.time()
            time_left = int(expiry_timestamp - now)
            logger.debug(f"Session expires in {time_left}")

        token = request.session.get("oauth_token")

        if token:
            expires_at = token.get("expires_at")
            now = time.time()

            if expires_at:
                time_left = int(expires_at - now)
                logger.debug(f"[Token] Time until expiration: {time_left} seconds")

                if expires_at <= now:
                    logger.info("[Token] Expired — attempting refresh")
                    try:
                        session = OAuth2Session(
                            client_id=oauth_config["client_id"],
                            client_secret=oauth_config["client_secret"],
                            token=token,
                            update_token=save_token,
                            refresh_token_url=oauth_config["access_token_url"],
                            token_endpoint=oauth_config["access_token_url"],
                            token_endpoint_auth_method=oauth_config.get(
                                "token_endpoint_auth_method", "client_secret_basic"
                            ),
                        )

                        new_token = session.refresh_token(
                            oauth_config["access_token_url"]
                        )
                        request.session["oauth_token"] = new_token
                        logger.info("[Token] Successfully refreshed token")

                    except Exception as e:
                        logger.error(f"[Token] Failed to refresh: {e}")
                        log_user_out(request)
                        return redirect(unauthorized_page)
        else:
            if request.user.is_authenticated:
                logger.warning(f"[Token] No token - logging user out.")
                log_user_out(request)

        if auth_required and not request.user.is_authenticated:
            return redirect(home_page)

        return self.get_response(request)
