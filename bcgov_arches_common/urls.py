from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns
from django.urls import include, path
from bcgov_arches_common.views.api.concept import ConceptsForNode
from bcgov_arches_common.views.api import user as api_user
from bcgov_arches_common.views import auth

urlpatterns = [
    path(
        "api/concepts_for_node/<slug:graph_slug>/<slug:node_alias>",
        ConceptsForNode.as_view(),
        name="concepts_for_node",
    ),
    path("api/user/", api_user.UserView.as_view(), name="api_user"),
    # OAuth views
    # Redirect the admin login page to use OAuth
    path(
        r"admin/login/",
        auth.login,
        name="admin_login",
    ),
    path(r"auth/", auth.login, name="auth_login"),
    path(r"auth/eoauth_cb", auth.auth_callback, name="auth_callback"),
    path(r"auth/logout/", auth.logout, name="auth_logout"),
    path(
        r"unauthorized/",
        auth.UnauthorizedView.as_view(),
        name="unauthorized",
    ),
]

# Adds URL pattern to serve media files during development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Only handle i18n routing in active project. This will still handle the routes provided by Arches core and Arches applications,
# but handling i18n routes in multiple places causes application errors.
if settings.ROOT_URLCONF == __name__:
    if settings.SHOW_LANGUAGE_SWITCH is True:
        urlpatterns = i18n_patterns(*urlpatterns)

    urlpatterns.append(path("i18n/", include("django.conf.urls.i18n")))
