import re
import logging
from django.shortcuts import redirect
from django.contrib.auth import login as system_login, logout as system_logout
from django.contrib.auth.models import User, Group
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_GROUPS = ["Guest", "Resource Exporter"]


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


def _self_register(userinfo):
    print(userinfo)
    user = None
    if (
        "allowed_self_register_domains" in settings.AUTHLIB_OAUTH_CLIENTS["default"]
        and userinfo["loginSource"].upper()
        in settings.AUTHLIB_OAUTH_CLIENTS["default"]["allowed_self_register_domains"]
    ):
        user = User(
            username=_clean_username(userinfo["preferred_username"]),
            first_name=userinfo["given_name"],
            last_name=userinfo["family_name"],
        )
        user.set_unusable_password()
        user.save()
        user.groups.set(Group.objects.filter(name__in=DEFAULT_GROUPS))
        user.save()
    return user


def log_user_out(request):
    request.session.pop("oauth_token", None)
    system_logout(request)


def log_user_in(request, token, next_url):
    logger.debug("In ExternalOauth (custom): %s" % token)
    try:
        username = _clean_username(token["userinfo"]["preferred_username"])
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print("User does not exist.. trying to self register")
        user = _self_register(token["userinfo"])

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
