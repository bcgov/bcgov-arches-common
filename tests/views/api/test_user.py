from unittest.mock import MagicMock

from django.test import RequestFactory, SimpleTestCase

from bcgov_arches_common.views.api.user import UserView


class UserViewTest(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @staticmethod
    def _user(
        is_active=True,
        is_superuser=False,
        groups=(("Editor", 3),),
        username="jsmith",
        first_name="Jane",
        last_name="Smith",
    ):
        user = MagicMock()
        user.is_active = is_active
        user.is_superuser = is_superuser
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.groups.values_list.return_value = list(groups)
        return user

    def _get(self, user):
        request = self.factory.get("/api/user/")
        request.user = user
        response = UserView.as_view()(request)
        if hasattr(response, "render"):  # DRF Response; the error path is a plain one
            response.render()
        return response

    def test_active_user_returns_profile(self):
        response = self._get(self._user())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "username": "jsmith",
                "first_name": "Jane",
                "last_name": "Smith",
                "groups": {"Editor": 3},
                "is_superuser": False,
            },
        )

    def test_groups_serialized_as_name_to_id_map(self):
        response = self._get(self._user(groups=(("Editor", 3), ("Admin", 1))))
        self.assertEqual(response.data["groups"], {"Editor": 3, "Admin": 1})

    def test_user_with_no_groups(self):
        response = self._get(self._user(groups=()))
        self.assertEqual(response.data["groups"], {})

    def test_superuser_flag_is_reported(self):
        response = self._get(self._user(is_superuser=True))
        self.assertIs(response.data["is_superuser"], True)

    def test_arches_anonymous_user_returns_profile(self):
        # SetAnonymousUser middleware swaps in the active "anonymous" User record.
        response = self._get(
            self._user(
                username="anonymous",
                first_name="",
                last_name="",
                groups=(("Guest", 2),),
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "username": "anonymous",
                "first_name": "",
                "last_name": "",
                "groups": {"Guest": 2},
                "is_superuser": False,
            },
        )

    def test_inactive_user_is_forbidden(self):
        # Also covers django's AnonymousUser (is_active is always False), i.e. a
        # request that SetAnonymousUser middleware didn't touch.
        response = self._get(self._user(is_active=False))
        self.assertEqual(response.status_code, 403)
