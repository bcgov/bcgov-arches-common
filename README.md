# bcgov-arches-common
Common assets and functionality across all Arches business areas within BCGov

# Welcome to the Arches Project!

Arches is a new, open-source, web-based, geospatial information system for cultural heritage inventory and management. Arches is purpose-built for the international cultural heritage field, and it is designed to record all types of immovable heritage, including archaeological sites, buildings and other historic structures, landscapes, and heritage ensembles or districts.

Please see the [project page](http://archesproject.org/) for more information on the Arches project.

The Arches Installation Guide and Arches User Guide are available [here](http://archesproject.org/documentation/).

## Functionality Provided:
### 1. Common OAuth framework:
Usage:
   1. Add the following OAuth configuration to your `settings.py`. Add app prefix to all the page configuration values. 
      ```python
      AUTHLIB_OAUTH_CLIENTS = {
          "default": {
              "client_id": get_env_variable("OAUTH_CLIENT_ID"),
              "client_secret": get_env_variable("OAUTH_CLIENT_SECRET"),
              "authorize_url": get_env_variable("OAUTH_AUTH_ENDPOINT"),
              "access_token_url": get_env_variable("OAUTH_TOKEN_ENDPOINT"),
              "refresh_token_url": get_env_variable("OAUTH_TOKEN_ENDPOINT"),
              "server_metadata_url": get_env_variable("OAUTH_SERVER_METADATA_URL"),
              "client_kwargs": {
                  "scope": "openid profile email",
                  "token_endpoint_auth_method": "client_secret_post",
              },
              "urls": {
                  "home_page": "/",
                  "unauthorized_page": "/unauthorized",
                  "unauthorized_template": "unauthorized.htm",
                  "auth_exempt_pages": [
                      "/",
                      "/unauthorized" "/index.htm",
                      "/auth",
                      "/auth/eoauth_start",
                      "/auth/eoauth_cb",
                  ],
              },
          }
      }
      ```
    
   2. Add the following entry to the settings.py MIDDLEWARE section after the Authentication and SessionMiddleware entries:
      ```python
      MIDDLEWARE = [
         ...
         "bcgov_arches_common.util.auth.oauth_token_refresh.OAuthTokenRefreshMiddleware",
         ...
      ]
      ```
   3. Ensure all the `OAUTH_*` variables are set in your environment
   4. Ensure the URLs have been added to your project:
      ```python
      urlpatterns = [
          # Your project URLs here
          path("bc-fossil-management/", include("bcgov_arches_common.urls")),
          path("bc-fossil-management/", include("arches.urls")),
      ]
      ```
