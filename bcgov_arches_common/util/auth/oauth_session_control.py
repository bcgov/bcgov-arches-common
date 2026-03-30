import re
import logging
from django.shortcuts import redirect
from django.contrib.auth import login as system_login, logout as system_logout
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


def _clean_username(username):
    # DLVR: IDIR = <username>@idir, TEST, PROD: IDIR = idir\\<username>
    # DLVR: BCSC = bcsc/<username>, TEST, PROD: ??
    username = (
        None
        if username is None
        else re.sub(r"^(idir|bcsc)[\\/](.*)$", r"\2@\1", username)
    )
    print(username)
    return username


def log_user_out(request):
    request.session.pop("oauth_token", None)
    system_logout(request)


def log_user_in(request, token, next_url):
    logger.debug("In ExternalOauth (custom): %s" % token)
    try:
        username = _clean_username(token["userinfo"]["preferred_username"])
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        user = None

    if user is not None:
        user.backend = "django.contrib.auth.backends.ModelBackend"
        system_login(
            request,
            user,
        )
        logger.debug("Next URL: %s" % next_url)
        return redirect(next_url)
    else:
        return redirect("unauthorized")
