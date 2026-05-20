from django.conf import settings
from django.views.generic import View
from django.shortcuts import render, redirect
from django.urls import reverse
from urllib.parse import urljoin
from bcgov_arches_common.util.auth.oauth_client import oauth
from bcgov_arches_common.util.auth.oauth_session_control import (
    log_user_in,
    log_user_out,
)
import logging

logger = logging.getLogger(__name__)

OAUTH_URLS = settings.AUTHLIB_OAUTH_CLIENTS["default"]["urls"]

PUBLIC_ORIGIN = settings.PUBLIC_ORIGIN if hasattr(settings, "PUBLIC_ORIGIN") else None
print(f"PUBLIC_ORIGIN {PUBLIC_ORIGIN}")


class UnauthorizedView(View):
    def get(self, request):
        return render(request, OAUTH_URLS["unauthorized_template"])


def login(request):
    print(f"PUBLIC_ORIGIN {PUBLIC_ORIGIN}")
    # Weird implementation of /auth/?logout=true to log user out.
    if request.GET.get("logout", False):
        return logout(request)
    redirect_uri = reverse("auth_callback")
    print(f"redirect_uri before: {redirect_uri}")

    redirect_uri = (
        request.build_absolute_uri(redirect_uri)
        if not PUBLIC_ORIGIN
        else urljoin(PUBLIC_ORIGIN, redirect_uri)
    )
    print(f"redirect_uri after : {redirect_uri}")
    return oauth.bcgov_oauth.authorize_redirect(request, redirect_uri)


def auth_callback(request):
    token = oauth.bcgov_oauth.authorize_access_token(request)
    request.session["oauth_token"] = token
    return log_user_in(request, token, OAUTH_URLS.get("home_page"))


def logout(request):
    log_user_out(request)
    return redirect(OAUTH_URLS.get("home_page"))
