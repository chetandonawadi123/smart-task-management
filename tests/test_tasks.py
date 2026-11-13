"""Integration checks for organization-scoped task endpoints.

Run from the project root, with PostgreSQL available:

    python -m unittest tests.test_tasks
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.user import User


class TaskApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"
        cls.owner = cls._register(
            f"Owner {cls.suffix}",
            f"task-owner-{cls.suffix}@example.com",
            f"Task Org {cls.suffix}",
        )
        cls.other_org = cls._register(
            f"Other {cls.suffix}",
            f"task-other-{cls.suffix}@example.com",
            f"Other Task Org {cls.suffix}",
        )
        cls.owner_token = cls._login(cls.owner["email"])
        cls.other_token = cls._login(cls.other_org["email"])

        created = cls.client.post(
            "/api/v1/projects/",
            headers=cls._headers(cls.owner_token),
            json={"name": f"Task project {cls.suffix}"},
        )
        assert created.status_code == 201, created.text
        cls.project_id = created.json()["id"]

        cls.member = cls._add_user(
            f"Member {cls.suffix}",
            f"task-member-{cls.suffix}@example.com",
            member_of=cls.project_id,
        )
        cls.non_member = cls._add_user(
            f"Non member {cls.suffix}",
            f"task-nonmember-{cls.suffix}@example.com",
        )
        cls.inactive_member = cls._add_user(
            f"Inactive {cls.suffix}",
            f"task-inactive-{cls.suffix}@example.com",
            active=False,
            member_of=cls.project_id,
        )
        cls.member_token = cls._login(cls.member["email"])
        cls.non_member_token = cls._login(cls.non_member["email"])

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            org_ids = [
                cls.owner["organization_id"],
                cls.other_org["organization_id"],
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

    @classmethod
    def _add_user(
        cls,
        name: str,
        email: str,
        *,
        active: bool = True,
        member_of: int | None = None,
    ) -> dict:
        db = SessionLocal()
        try:
            user = User(
                organization_id=cls.owner["organization_id"],
                name=name,
                email=email,
                password_hash=hash_password(cls.password),
                role="employee",
                is_active=active,
            )
            db.add(user)
            db.flush()
            if member_of is not None:
                db.add(ProjectMember(project_id=member_of, user_id=user.id))
            db.commit()
            return {
                "id": user.id,
                "email": email,
                "organization_id": cls.owner["organization_id"],
            }
        finally:
            db.close()

    @staticmethod
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def _create(self, payload: dict, token: str | None = None):
        return self.client.post(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(token or self.owner_token),
            json=payload,
        )

    def test_crud_filters_assignment_and_isolation(self):
        unauthenticated = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/"
        )
        self.assertEqual(unauthenticated.status_code, 401)

        rejected_owner_fields = self._create(
            {
                "title": "Do not trust the client",
                "created_by": 1,
                "project_id": 1,
            }
        )
        self.assertEqual(rejected_owner_fields.status_code, 422)

        self.assertEqual(self._create({"title": "   "}).status_code, 422)
        self.assertEqual(
            self._create({"title": "x" * 201}).status_code,
            422,
        )

        due_date = datetime.now(timezone.utc) + timedelta(days=2)
        created = self._create(
            {
                "title": "  Draft spec  ",
                "description": "  Initial notes  ",
                "priority": "HIGH",
                "status": "TODO",
                "due_date": due_date.isoformat(),
            }
        )
        self.assertEqual(created.status_code, 201, created.text)
        task = created.json()
        task_id = task["id"]
        self.assertEqual(task["title"], "Draft spec")
        self.assertEqual(task["description"], "Initial notes")
        self.assertEqual(task["priority"], "high")
        self.assertEqual(task["status"], "todo")
        self.assertEqual(task["project_id"], self.project_id)
        self.assertEqual(task["created_by"], self.owner["id"])
        self.assertIsNone(task["assigned_to"])
        self.assertIsNotNone(task["created_at"])
        self.assertIsNotNone(task["updated_at"])

        assigned_create = self._create(
            {
                "title": "Owned by a member",
                "assigned_to": self.member["id"],
                "priority": "critical",
                "status": "in_progress",
            }
        )
        self.assertEqual(assigned_create.status_code, 201, assigned_create.text)
        self.assertEqual(assigned_create.json()["assigned_to"], self.member["id"])
        self.assertEqual(assigned_create.json()["created_by"], self.owner["id"])

        review = self._create(
            {"title": "Needs review", "status": "in_review", "priority": "low"}
        )
        self.assertEqual(review.status_code, 201, review.text)

        listed = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(listed.status_code, 200, listed.text)
        body = listed.json()
        self.assertEqual(body["total"], 3)
        self.assertEqual(body["limit"], 20)
        self.assertEqual(body["offset"], 0)
        self.assertEqual(body["items"][0]["id"], review.json()["id"])

        page = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            params={"limit": 1, "offset": 1},
        )
        self.assertEqual(page.status_code, 200, page.text)
        self.assertEqual(page.json()["total"], 3)
        self.assertEqual(len(page.json()["items"]), 1)
        self.assertEqual(page.json()["items"][0]["id"], assigned_create.json()["id"])

        by_status = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            params={"status": "IN_PROGRESS"},
        )
        self.assertEqual(by_status.status_code, 200, by_status.text)
        self.assertEqual(by_status.json()["total"], 1)
        self.assertEqual(by_status.json()["items"][0]["status"], "in_progress")

        by_priority = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            params={"priority": "low", "status": "in_review"},
        )
        self.assertEqual(by_priority.status_code, 200, by_priority.text)
        self.assertEqual(by_priority.json()["total"], 1)
        self.assertEqual(by_priority.json()["items"][0]["id"], review.json()["id"])

        invalid_filter = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.owner_token),
            params={"status": "completed"},
        )
        self.assertEqual(invalid_filter.status_code, 422)

        fetched = self.client.get(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(fetched.status_code, 200, fetched.text)
        self.assertEqual(fetched.json()["title"], "Draft spec")

        other_org_get = self.client.get(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.other_token),
        )
        self.assertEqual(other_org_get.status_code, 404)
        self.assertEqual(other_org_get.json()["detail"], "Task not found")

        other_org_list = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.other_token),
        )
        self.assertEqual(other_org_list.status_code, 404)
        self.assertEqual(other_org_list.json()["detail"], "Project not found")

        other_org_create = self._create(
            {"title": "Cross tenant"},
            token=self.other_token,
        )
        self.assertEqual(other_org_create.status_code, 404)

        non_member_list = self.client.get(
            f"/api/v1/projects/{self.project_id}/tasks/",
            headers=self._headers(self.non_member_token),
        )
        self.assertEqual(non_member_list.status_code, 403)
        self.assertEqual(
            non_member_list.json()["detail"],
            "You are not a member of this project",
        )

        non_member_create = self._create(
            {"title": "Should fail"},
            token=self.non_member_token,
        )
        self.assertEqual(non_member_create.status_code, 403)

        outside_assignee = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.owner_token),
            json={"assigned_to": self.other_org["id"]},
        )
        self.assertEqual(outside_assignee.status_code, 404)
        self.assertEqual(outside_assignee.json()["detail"], "Assignee not found")

        unknown_assignee = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.owner_token),
            json={"assigned_to": 999999999},
        )
        self.assertEqual(unknown_assignee.status_code, 404)

        not_project_member = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.owner_token),
            json={"assigned_to": self.non_member["id"]},
        )
        self.assertEqual(not_project_member.status_code, 422)
        self.assertEqual(
            not_project_member.json()["detail"],
            "Assignee must be a member of the project",
        )

        inactive = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.owner_token),
            json={"assigned_to": self.inactive_member["id"]},
        )
        self.assertEqual(inactive.status_code, 422)
        self.assertEqual(inactive.json()["detail"], "Assignee must be an active user")

        still_unassigned = self.client.get(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.owner_token),
        )
        self.assertIsNone(still_unassigned.json()["assigned_to"])

        assigned = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.member_token),
            json={"assigned_to": self.member["id"]},
        )
        self.assertEqual(assigned.status_code, 200, assigned.text)
        self.assertEqual(assigned.json()["assigned_to"], self.member["id"])
        self.assertGreater(
            assigned.json()["updated_at"],
            task["updated_at"],
        )

        cleared = self.client.patch(
            f"/api/v1/tasks/{task_id}/assignee",
            headers=self._headers(self.owner_token),
            json={"assigned_to": None},
        )
        self.assertEqual(cleared.status_code, 200, cleared.text)
        self.assertIsNone(cleared.json()["assigned_to"])

        status_change = self.client.patch(
            f"/api/v1/tasks/{task_id}/status",
            headers=self._headers(self.owner_token),
            json={"status": "IN_REVIEW"},
        )
        self.assertEqual(status_change.status_code, 200, status_change.text)
        self.assertEqual(status_change.json()["status"], "in_review")
        self.assertEqual(status_change.json()["title"], "Draft spec")

        rejected_status = self.client.patch(
            f"/api/v1/tasks/{task_id}/status",
            headers=self._headers(self.owner_token),
            json={"status": "completed"},
        )
        self.assertEqual(rejected_status.status_code, 422)

        non_member_status = self.client.patch(
            f"/api/v1/tasks/{task_id}/status",
            headers=self._headers(self.non_member_token),
            json={"status": "done"},
        )
        self.assertEqual(non_member_status.status_code, 403)

        updated = self.client.put(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.owner_token),
            json={
                "title": "Draft spec v2",
                "description": None,
                "priority": "medium",
                "due_date": None,
                "status": "done",
            },
        )
        self.assertEqual(updated.status_code, 422)

        updated = self.client.put(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.owner_token),
            json={
                "title": "Draft spec v2",
                "description": None,
                "priority": "medium",
                "due_date": None,
            },
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["title"], "Draft spec v2")
        self.assertIsNone(updated.json()["description"])
        self.assertEqual(updated.json()["priority"], "medium")
        self.assertIsNone(updated.json()["due_date"])
        self.assertEqual(updated.json()["status"], "in_review")
        self.assertEqual(updated.json()["created_by"], self.owner["id"])
        self.assertEqual(updated.json()["project_id"], self.project_id)

        other_org_delete = self.client.delete(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.other_token),
        )
        self.assertEqual(other_org_delete.status_code, 404)

        db = SessionLocal()
        try:
            db.add(
                TaskComment(
                    task_id=task_id,
                    user_id=self.owner["id"],
                    comment="Remove me with the task",
                )
            )
            db.commit()
        finally:
            db.close()

        deleted = self.client.delete(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(deleted.status_code, 204, deleted.text)
        self.assertEqual(deleted.content, b"")

        missing = self.client.get(
            f"/api/v1/tasks/{task_id}",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(missing.status_code, 404)

        db = SessionLocal()
        try:
            comment = db.scalar(
                select(TaskComment).where(TaskComment.task_id == task_id)
            )
            self.assertIsNone(comment)
        finally:
            db.close()

        invalid_create = self._create(
            {
                "title": "Bad assignee",
                "assigned_to": self.non_member["id"],
            }
        )
        self.assertEqual(invalid_create.status_code, 422)

    def test_database_rejects_retired_status_and_priority(self):
        db = SessionLocal()
        try:
            retired = Task(
                project_id=self.project_id,
                created_by=self.owner["id"],
                title="Retired values",
                status="completed",
                priority="urgent",
            )
            db.add(retired)
            with self.assertRaises(IntegrityError):
                db.commit()
            db.rollback()
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
