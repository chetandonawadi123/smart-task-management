"""Integration checks for organization-scoped project endpoints.

Run from the project root, with PostgreSQL available:

    python -m unittest tests.test_projects
"""

import unittest
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User


class ProjectApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"
        cls.user_a = cls._register(
            f"Owner {cls.suffix}",
            f"owner-{cls.suffix}@example.com",
            f"Org A {cls.suffix}",
        )
        cls.user_b = cls._register(
            f"Other {cls.suffix}",
            f"other-{cls.suffix}@example.com",
            f"Org B {cls.suffix}",
        )
        cls.token_a = cls._login(cls.user_a["email"])
        cls.token_b = cls._login(cls.user_b["email"])

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            org_ids = [
                cls.user_a["organization_id"],
                cls.user_b["organization_id"],
            ]
            projects = list(
                db.scalars(
                    select(Project).where(Project.organization_id.in_(org_ids))
                )
            )
            for project in projects:
                db.delete(project)
            db.flush()

            users = list(
                db.scalars(select(User).where(User.organization_id.in_(org_ids)))
            )
            for user in users:
                db.delete(user)
            db.flush()

            organizations = list(
                db.scalars(
                    select(Organization).where(Organization.id.in_(org_ids))
                )
            )
            for organization in organizations:
                db.delete(organization)
            db.commit()
        finally:
            db.close()

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
        assert response.status_code == 201, response.text
        body = response.json()
        body["email"] = email
        return body

    @classmethod
    def _login(cls, email: str) -> str:
        response = cls.client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": cls.password},
        )
        assert response.status_code == 200, response.text
        return response.json()["access_token"]

    def _headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def test_project_lifecycle_and_organization_isolation(self):
        created = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={
                "name": "  Launch plan  ",
                "description": "  First release  ",
                "organization_id": 999,
                "owner_id": 999,
            },
        )
        self.assertEqual(created.status_code, 422)

        created = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={
                "name": "  Launch plan  ",
                "description": "  First release  ",
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        project = created.json()
        project_id = project["id"]
        self.assertEqual(project["name"], "Launch plan")
        self.assertEqual(project["description"], "First release")
        self.assertEqual(project["organization_id"], self.user_a["organization_id"])
        self.assertEqual(project["owner_id"], self.user_a["id"])
        self.assertNotIn("password_hash", project)

        listed = self.client.get(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
        )
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertIn(project_id, [item["id"] for item in listed.json()])

        other_list = self.client.get(
            "/api/v1/projects/",
            headers=self._headers(self.token_b),
        )
        self.assertEqual(other_list.status_code, 200, other_list.text)
        self.assertNotIn(project_id, [item["id"] for item in other_list.json()])

        fetched = self.client.get(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_a),
        )
        self.assertEqual(fetched.status_code, 200, fetched.text)
        self.assertEqual(fetched.json()["id"], project_id)

        hidden = self.client.get(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_b),
        )
        self.assertEqual(hidden.status_code, 404, hidden.text)
        self.assertEqual(hidden.json()["detail"], "Project not found")

        rejected_update = self.client.put(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_b),
            json={"name": "Taken over"},
        )
        self.assertEqual(rejected_update.status_code, 404, rejected_update.text)

        updated = self.client.put(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_a),
            json={"name": "Launch plan v2", "description": None},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["name"], "Launch plan v2")
        self.assertIsNone(updated.json()["description"])
        self.assertEqual(updated.json()["organization_id"], self.user_a["organization_id"])
        self.assertEqual(updated.json()["owner_id"], self.user_a["id"])

        missing_name = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={"description": "No name"},
        )
        self.assertEqual(missing_name.status_code, 422, missing_name.text)

        blank_name = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={"name": "   "},
        )
        self.assertEqual(blank_name.status_code, 422, blank_name.text)

        long_name = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={"name": "x" * 151},
        )
        self.assertEqual(long_name.status_code, 422, long_name.text)

        optional_description = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={"name": "Notes only"},
        )
        self.assertEqual(optional_description.status_code, 201, optional_description.text)
        self.assertIsNone(optional_description.json()["description"])

        unauthenticated = self.client.get("/api/v1/projects/")
        self.assertEqual(unauthenticated.status_code, 401, unauthenticated.text)

        missing = self.client.get(
            "/api/v1/projects/999999999",
            headers=self._headers(self.token_a),
        )
        self.assertEqual(missing.status_code, 404, missing.text)

        rejected_delete = self.client.delete(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_b),
        )
        self.assertEqual(rejected_delete.status_code, 404, rejected_delete.text)

        deleted = self.client.delete(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_a),
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self.assertEqual(deleted.content, b"")

        gone = self.client.get(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_a),
        )
        self.assertEqual(gone.status_code, 404, gone.text)

    def test_delete_removes_owner_membership_and_tasks(self):
        created = self.client.post(
            "/api/v1/projects/",
            headers=self._headers(self.token_a),
            json={"name": "Cascade project", "description": "temporary"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        project_id = created.json()["id"]

        db = SessionLocal()
        try:
            membership = db.scalar(
                select(ProjectMember).where(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == self.user_a["id"],
                )
            )
            self.assertIsNotNone(membership)

            db.add(
                Task(
                    project_id=project_id,
                    created_by=self.user_a["id"],
                    title="Follow up",
                )
            )
            db.commit()
        finally:
            db.close()

        deleted = self.client.delete(
            f"/api/v1/projects/{project_id}",
            headers=self._headers(self.token_a),
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)

        db = SessionLocal()
        try:
            self.assertIsNone(db.get(Project, project_id))
            remaining_task = db.scalar(
                select(Task).where(Task.project_id == project_id)
            )
            remaining_member = db.scalar(
                select(ProjectMember).where(ProjectMember.project_id == project_id)
            )
            self.assertIsNone(remaining_task)
            self.assertIsNone(remaining_member)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
