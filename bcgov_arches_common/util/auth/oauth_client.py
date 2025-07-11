from authlib.integrations.django_client import OAuth
from django.conf import settings
from bcgov_arches_common.util.auth.token_store import save_token


oauth = OAuth()
oauth.register(
    name="bcgov_oauth",
    **settings.AUTHLIB_OAUTH_CLIENTS["default"],
    update_token=save_token,
)
