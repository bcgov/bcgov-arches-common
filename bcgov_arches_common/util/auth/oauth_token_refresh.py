import time
import logging
from django.shortcuts import redirect
from authlib.integrations.requests_client import OAuth2Session
from django.conf import settings
from bcgov_arches_common.util.auth.token_store import save_token
from bcgov_arches_common.util.auth.oauth_session_control import log_user_out

logger = logging.getLogger(__name__)


OAUTH_CONFIG = settings.AUTHLIB_OAUTH_CLIENTS["default"]
HOME_PAGE = OAUTH_CONFIG["urls"]["home_page"]
UNAUTHORIZED_PAGE = OAUTH_CONFIG["urls"]["unauthorized_page"]
AUTH_REQUIRED = (
    OAUTH_CONFIG["auth_required"] if "auth_required" in OAUTH_CONFIG else True
)
EXEMPT_PATHS = OAUTH_CONFIG["urls"]["auth_exempt_pages"]


def bypass_auth(request):
    request_source = (
        request.META.get("REMOTE_ADDR")
        if request.META.get("HTTP_X_FORWARDED_FOR") is None
        else request.META.get("HTTP_X_FORWARDED_FOR")
    )  # return True
    return request.path.rstrip("/") in EXEMPT_PATHS or (
        request_source in settings.AUTH_BYPASS_HOSTS
        and request.META.get("HTTP_USER_AGENT").startswith("node-fetch/1.0")
    )


class OAuthTokenRefreshMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.oauth_config = OAUTH_CONFIG

    def __call__(self, request):
        if bypass_auth(request):
            return self.get_response(request)

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
                            client_id=self.oauth_config["client_id"],
                            client_secret=self.oauth_config["client_secret"],
                            token=token,
                            update_token=save_token,
                            refresh_token_url=self.oauth_config["access_token_url"],
                            token_endpoint=self.oauth_config["access_token_url"],
                            token_endpoint_auth_method=self.oauth_config.get(
                                "token_endpoint_auth_method", "client_secret_basic"
                            ),
                        )

                        new_token = session.refresh_token(
                            self.oauth_config["access_token_url"]
                        )
                        request.session["oauth_token"] = new_token
                        logger.info("[Token] Successfully refreshed token")

                    except Exception as e:
                        logger.error(f"[Token] Failed to refresh: {e}")
                        log_user_out(request)
                        return redirect(UNAUTHORIZED_PAGE)
        else:
            if request.user.is_authenticated:
                logger.warning(f"[Token] No token - logging user out.")
                log_user_out(request)

        if AUTH_REQUIRED and not request.user.is_authenticated:
            return redirect(HOME_PAGE)

        return self.get_response(request)
