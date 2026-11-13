import unittest
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.models.notification import Notification


class NotificationApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"

        # Org 1
        cls.owner = cls._register(
            f"Owner {cls.suffix}",
            f"notif-owner-{cls.suffix}@example.com",
            f"Notif Org {cls.suffix}",
        )
        cls.owner_token = cls._login(cls.owner["email"])

        # Create Project
        res = cls.client.post(
            "/api/v1/projects/",
            headers=cls._headers(cls.owner_token),
            json={"name": "Notif Project"},
        )
        cls.project_id = res.json()["id"]

        # Add Member
        cls.member = cls._add_user(
            f"Member {cls.suffix}",
            f"notif-member-{cls.suffix}@example.com",
            cls.owner["organization_id"],
            member_of=cls.project_id,
        )
        cls.member_token = cls._login(cls.member["email"])

        # Org 2 (Isolation)
        cls.other_org = cls._register(
            f"Other {cls.suffix}",
            f"notif-other-{cls.suffix}@example.com",
            f"Other Notif Org {cls.suffix}",
        )
        cls.other_token = cls._login(cls.other_org["email"])

    @classmethod
    def _register(cls, name: str, email: str, organization_name: str) -> dict:
        response = cls.client.post(
            "/api/v1/auth/register",
            json={
                "name": name,
                "email": email,
                "password": cls.password,
                "organization_name": organization_name,
            },
        )
        assert response.status_code == 201
        body = response.json()
        body["email"] = email
        return body

    @classmethod
    def _login(cls, email: str) -> str:
        response = cls.client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": cls.password},
        )
        assert response.status_code == 200
        return response.json()["access_token"]

    @classmethod
    def _add_user(cls, name: str, email: str, org_id: int, member_of: int | None = None) -> dict:
        db = SessionLocal()
        try:
            user = User(
                organization_id=org_id,
                name=name,
                email=email,
                password_hash=hash_password(cls.password),
                role="employee",
                is_active=True,
            )
            db.add(user)
            db.flush()
            if member_of:
                db.add(ProjectMember(project_id=member_of, user_id=user.id))
            db.commit()
            return {"id": user.id, "email": email, "organization_id": org_id}
        finally:
            db.close()

    @staticmethod
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def test_notification_triggers(self):
        # 1. Task Assignment Trigger
        task_res = self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            json={
                "title": "Assigned Task",
                "assigned_to": self.member["id"],
                "status": "todo",
                "priority": "medium"
            },
        )
        self.assertEqual(task_res.status_code, 201)
        task_id = task_res.json()["id"]

        # Check member got notification
        notif_res = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.member_token),
        )
        self.assertEqual(notif_res.status_code, 200)
        notifs = notif_res.json()["items"]
        self.assertTrue(any(n["notification_type"] == "task_assigned" for n in notifs))

        # 2. Status Change Trigger
        status_res = self.client.patch(
            f"/api/v1/tasks/{task_id}/status",
            headers=self._headers(self.owner_token),
            json={"status": "in_progress"},
        )
        self.assertEqual(status_res.status_code, 200)

        notif_res = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.member_token),
        )
        notifs = notif_res.json()["items"]
        self.assertTrue(any(n["notification_type"] == "task_status_changed" for n in notifs))

        # 3. Comment Trigger
        comment_res = self.client.post(
            f"/api/v1/tasks/{task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "Owner comment"},
        )
        self.assertEqual(comment_res.status_code, 201)

        notif_res = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.member_token),
        )
        notifs = notif_res.json()["items"]
        self.assertTrue(any(n["notification_type"] == "new_comment" for n in notifs))

    def test_self_notification_prevention(self):
        # Owner creates task assigned to themselves (though UI usually handles this, we check logic)
        self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            json={
                "title": "Self Assigned Task",
                "assigned_to": self.owner["id"],
                "status": "todo",
                "priority": "medium"
            },
        )
        # Owner should NOT have a new assignment notification
        notif_res = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.owner_token),
        )
        notifs = notif_res.json()["items"]
        self.assertFalse(any(n["notification_type"] == "task_assigned" and n["title"] == "New Task Assigned" for n in notifs))

    def test_notification_management(self):
        # Ensure at least one notification exists for member
        self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            json={
                "title": "Manage Task",
                "assigned_to": self.member["id"],
                "status": "todo",
                "priority": "medium"
            },
        )

        # 1. Unread count
        count_res = self.client.get(
            "/api/v1/notifications/unread-count",
            headers=self._headers(self.member_token),
        )
        self.assertGreater(count_res.json()["unread_count"], 0)

        # 2. Mark one as read
        notifs = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.member_token),
            params={"unread_only": True}
        ).json()["items"]
        notif_id = notifs[0]["id"]

        read_res = self.client.patch(
            f"/api/v1/notifications/{notif_id}/read",
            headers=self._headers(self.member_token),
        )
        self.assertEqual(read_res.status_code, 200)

        # 3. Mark all as read
        self.client.patch(
            "/api/v1/notifications/read-all",
            headers=self._headers(self.member_token),
        )
        count_res = self.client.get(
            "/api/v1/notifications/unread-count",
            headers=self._headers(self.member_token),
        )
        self.assertEqual(count_res.json()["unread_count"], 0)

        # 4. Delete
        del_res = self.client.delete(
            f"/api/v1/notifications/{notif_id}",
            headers=self._headers(self.member_token),
        )
        self.assertEqual(del_res.status_code, 204)

    def test_organization_and_user_isolation(self):
        # Create notif for member in Org 1
        self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            json={
                "title": "Isolation Task",
                "assigned_to": self.member["id"],
                "status": "todo",
                "priority": "medium"
            },
        )
        notif_id = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.member_token)
        ).json()["items"][0]["id"]

        # Other Org user cannot see it
        other_res = self.client.get(
            "/api/v1/notifications/",
            headers=self._headers(self.other_token)
        )
        self.assertEqual(other_res.json()["total"], 0)

        # Other user in same Org cannot mark as read
        owner_read_res = self.client.patch(
            f"/api/v1/notifications/{notif_id}/read",
            headers=self._headers(self.owner_token)
        )
        self.assertEqual(owner_read_res.status_code, 404)

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            org_ids = [cls.owner["organization_id"], cls.other_org["organization_id"]]

            # Notifications should be deleted by cascade, but let's be safe

            projects = db.scalars(select(Project).where(Project.organization_id.in_(org_ids))).all()
            for p in projects:
                db.delete(p)
            db.flush()

            users = db.scalars(select(User).where(User.organization_id.in_(org_ids))).all()
            for u in users:
                db.delete(u)
            db.flush()

            orgs = db.scalars(select(Organization).where(Organization.id.in_(org_ids))).all()
            for o in orgs:
                db.delete(o)
            db.commit()
        finally:
            db.close()
