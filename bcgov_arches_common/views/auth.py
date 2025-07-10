from django.conf import settings
from django.views.generic import View
from django.shortcuts import render, redirect
from django.urls import reverse
from bcgov_arches_common.util.auth.oauth_client import oauth
from bcgov_arches_common.util.auth.oauth_session_control import (
    log_user_in,
    log_user_out,
)
import logging

logger = logging.getLogger(__name__)

OAUTH_URLS = settings.AUTHLIB_OAUTH_CLIENTS["default"]["urls"]


class UnauthorizedView(View):
    def get(self, request):
        return render(request, OAUTH_URLS["unauthorized_template"])


def login(request):
    # Weird implementation of /auth/?logout=true to log user out.
    if request.GET.get("logout", False):
        return logout(request)
    redirect_uri = request.build_absolute_uri(reverse("auth_callback"))
    return oauth.bcgov_oauth.authorize_redirect(request, redirect_uri)


def auth_callback(request):
    token = oauth.bcgov_oauth.authorize_access_token(request)
    request.session["oauth_token"] = token
    return log_user_in(request, token, OAUTH_URLS.get("home_page"))


def logout(request):
    log_user_out(request)
    return redirect(OAUTH_URLS.get("home_page"))
