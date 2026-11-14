import unittest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.project import Project
from app.models.user import User
from app.core.security import hash_password

class EmailNotificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"

        # Org 1
        cls.owner = cls._register(
            f"Owner {cls.suffix}",
            f"email-owner-{cls.suffix}@example.com",
            f"Email Org {cls.suffix}",
        )
        cls.owner_token = cls._login(cls.owner["email"])

        # Create Project
        res = cls.client.post(
            "/api/v1/projects/",
            headers=cls._headers(cls.owner_token),
            json={"name": "Email Project"},
        )
        cls.project_id = res.json()["id"]

        # Add Member
        cls.member = cls._add_user(
            f"Member {cls.suffix}",
            f"email-member-{cls.suffix}@example.com",
            cls.owner["organization_id"],
            member_of=cls.project_id,
        )
        cls.member_token = cls._login(cls.member["email"])

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
            from app.models.project_member import ProjectMember
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
            return {"id": user.id, "email": email, "organization_id": org_id, "name": name}
        finally:
            db.close()

    @staticmethod
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    @patch("app.services.email_service.send_email")
    def test_task_assignment_email_triggered(self, mock_send_email):
        # Create Task assigned to member
        task_res = self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            json={
                "title": "Email Task",
                "assigned_to": self.member["id"],
                "status": "todo",
                "priority": "medium"
            },
        )
        self.assertEqual(task_res.status_code, 201)

        # Verify email was mocked and called
        mock_send_email.assert_called_once()
        args, _ = mock_send_email.call_args
        self.assertEqual(args[0], self.member["email"])
        self.assertIn("Task Assigned", args[1])

    @patch("app.services.email_service.send_email")
    def test_task_reassignment_email_triggered(self, mock_send_email):
        # Create Task assigned to member
        task_res = self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            json={
                "title": "Reassign Task",
                "assigned_to": self.member["id"],
                "status": "todo",
                "priority": "medium"
            },
        )
        task_id = task_res.json()["id"]
        mock_send_email.reset_mock()

        # Add another member
        new_member = self._add_user(
            f"New Member {self.suffix}",
            f"new-member-{self.suffix}@example.com",
            self.owner["organization_id"],
            member_of=self.project_id,
        )

        # Reassign task to new member
        patch_res = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.owner_token),
            json={"assigned_to": new_member["id"]},
        )
        self.assertEqual(patch_res.status_code, 200)

        # Verify email was sent to new member
        mock_send_email.assert_called_once()
        args, _ = mock_send_email.call_args
        self.assertEqual(args[0], new_member["email"])
        self.assertIn("Task Reassigned", args[1])

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            from app.models.project_member import ProjectMember
            org_id = cls.owner["organization_id"]

            projects = db.scalars(select(Project).where(Project.organization_id == org_id)).all()
            for p in projects:
                db.delete(p)
            db.flush()

            users = db.scalars(select(User).where(User.organization_id == org_id)).all()
            for u in users:
                db.delete(u)
            db.flush()

            org = db.scalar(select(Organization).where(Organization.id == org_id))
            if org:
                db.delete(org)
            db.commit()
        finally:
            db.close()
