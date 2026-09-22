from http import HTTPStatus

from django.utils.translation import gettext as _

from arches.app.utils.response import JSONErrorResponse
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.serializers import (
    BooleanField,
    CharField,
    Serializer,
    SerializerMethodField,
)
from rest_framework.views import APIView


class UserResponseSerializer(Serializer):
    username = CharField()
    first_name = CharField(allow_blank=True)
    last_name = CharField(allow_blank=True)
    groups = SerializerMethodField()
    is_superuser = BooleanField()

    def get_groups(self, user) -> dict[str, int]:
        return dict(user.groups.values_list("name", "id"))


class UserView(APIView):
    """The signed-in user's name and group memberships."""

    http_method_names = ["get"]
    permission_classes = [AllowAny]
    serializer_class = UserResponseSerializer

    def get(self, request):
        if not request.user.is_active:
            return JSONErrorResponse(
                title=_("Login required"),
                message=_("This account is no longer active."),
                status=HTTPStatus.FORBIDDEN,
            )

        # N.B.: SetAnonymousUser middleware provides an anonymous User, so don't
        # infer from a 200 OK that you have an authenticated user.
        return Response(self.serializer_class(request.user).data)
