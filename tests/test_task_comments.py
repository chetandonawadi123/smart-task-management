"""Integration checks for task comment endpoints.

Run from the project root, with PostgreSQL available:

    python -m unittest tests.test_task_comments
"""

import unittest
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.models.user import User


class TaskCommentApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"
        cls.owner = cls._register(
            f"Owner {cls.suffix}",
            f"comm-owner-{cls.suffix}@example.com",
            f"Comm Org {cls.suffix}",
        )
        cls.other_org = cls._register(
            f"Other {cls.suffix}",
            f"comm-other-{cls.suffix}@example.com",
            f"Other Comm Org {cls.suffix}",
        )
        cls.owner_token = cls._login(cls.owner["email"])
        cls.other_token = cls._login(cls.other_org["email"])

        created = cls.client.post(
            "/api/v1/projects/",
            headers=cls._headers(cls.owner_token),
            json={"name": f"Comm project {cls.suffix}"},
        )
        assert created.status_code == 201, created.text
        cls.project_id = created.json()["id"]

        cls.member = cls._add_user(
            f"Member {cls.suffix}",
            f"comm-member-{cls.suffix}@example.com",
            member_of=cls.project_id,
        )
        cls.non_member = cls._add_user(
            f"Non Member {cls.suffix}",
            f"comm-nonmember-{cls.suffix}@example.com",
        )
        cls.member_token = cls._login(cls.member["email"])
        cls.non_member_token = cls._login(cls.non_member["email"])

        # Create a task for testing
        task_res = cls.client.post(
            f"/api/v1/projects/{cls.project_id}/tasks/",
            headers=cls._headers(cls.owner_token),
            json={"title": "Comment test task"},
        )
        assert task_res.status_code == 201, task_res.text
        cls.task_id = task_res.json()["id"]

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            org_ids = [
                cls.owner["organization_id"],
                cls.other_org["organization_id"],
            ]
            projects = list(
                db.scalars(select(Project).where(Project.organization_id.in_(org_ids)))
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

            orgs = list(
                db.scalars(select(Organization).where(Organization.id.in_(org_ids)))
            )
            for org in orgs:
                db.delete(org)
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
                is_active=True,
            )
            db.add(user)
            db.flush()
            if member_of is not None:
                db.add(ProjectMember(project_id=member_of, user_id=user.id))
            db.commit()
            return {
                "id": user.id,
                "email": email,
            }
        finally:
            db.close()

    @staticmethod
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def test_comment_creation(self):
        # Successful comment creation
        res = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "   First comment   "},
        )
        self.assertEqual(res.status_code, 201, res.text)
        data = res.json()
        self.assertEqual(data["comment"], "First comment")
        self.assertEqual(data["task_id"], self.task_id)
        self.assertEqual(data["user_id"], self.owner["id"])
        self.assertIsNotNone(data["id"])
        self.assertIsNotNone(data["created_at"])

        # Reject payload trying to pass user_id explicitly
        rejected_user_id = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "Attempting user_id override", "user_id": 999},
        )
        self.assertEqual(rejected_user_id.status_code, 422)

    def test_empty_comment_validation(self):
        # Empty string
        res_empty = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": ""},
        )
        self.assertEqual(res_empty.status_code, 422)

        # Whitespace-only string
        res_spaces = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "     \n  \t "},
        )
        self.assertEqual(res_spaces.status_code, 422)

        # Update with empty/whitespace comment
        comment_res = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "Valid comment to update"},
        )
        comment_id = comment_res.json()["id"]

        update_empty = self.client.put(
            f"/api/v1/comments/{comment_id}",
            headers=self._headers(self.owner_token),
            json={"comment": "   "},
        )
        self.assertEqual(update_empty.status_code, 422)

    def test_comment_listing_and_pagination(self):
        # Create multiple comments
        c1 = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "Comment 1"},
        ).json()

        c2 = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.member_token),
            json={"comment": "Comment 2"},
        ).json()

        # List comments - newest first
        res = self.client.get(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertGreaterEqual(body["total"], 2)
        # Verify order (c2 created after c1)
        items = body["items"]
        c2_index = next(i for i, item in enumerate(items) if item["id"] == c2["id"])
        c1_index = next(i for i, item in enumerate(items) if item["id"] == c1["id"])
        self.assertLess(c2_index, c1_index)

        # Pagination limit & offset
        paginated_res = self.client.get(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            params={"limit": 1, "offset": 0},
        )
        self.assertEqual(paginated_res.status_code, 200)
        p_body = paginated_res.json()
        self.assertEqual(len(p_body["items"]), 1)
        self.assertEqual(p_body["limit"], 1)
        self.assertEqual(p_body["offset"], 0)

    def test_comment_update_and_non_author_rejection(self):
        comment_res = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "Original text"},
        )
        comment_id = comment_res.json()["id"]

        # Non-author cannot update
        non_author_res = self.client.put(
            f"/api/v1/comments/{comment_id}",
            headers=self._headers(self.member_token),
            json={"comment": "Hacked text"},
        )
        self.assertEqual(non_author_res.status_code, 403)
        self.assertEqual(non_author_res.json()["detail"], "Only the author can update this comment")

        # Author can update
        author_res = self.client.put(
            f"/api/v1/comments/{comment_id}",
            headers=self._headers(self.owner_token),
            json={"comment": "Updated text"},
        )
        self.assertEqual(author_res.status_code, 200)
        self.assertEqual(author_res.json()["comment"], "Updated text")

    def test_comment_deletion_and_non_author_rejection(self):
        comment_res = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.owner_token),
            json={"comment": "To be deleted"},
        )
        comment_id = comment_res.json()["id"]

        # Non-author cannot delete
        non_author_res = self.client.delete(
            f"/api/v1/comments/{comment_id}",
            headers=self._headers(self.member_token),
        )
        self.assertEqual(non_author_res.status_code, 403)
        self.assertEqual(non_author_res.json()["detail"], "Only the author can delete this comment")

        # Author can delete
        author_res = self.client.delete(
            f"/api/v1/comments/{comment_id}",
            headers=self._headers(self.owner_token),
        )
        self.assertEqual(author_res.status_code, 204)
        self.assertEqual(author_res.content, b"")

        # Verify comment is deleted
        db = SessionLocal()
        try:
            db_comment = db.scalar(select(TaskComment).where(TaskComment.id == comment_id))
            self.assertIsNone(db_comment)
        finally:
            db.close()

    def test_organization_isolation_and_non_member_rejection(self):
        # Non-project member from same org trying to access/create
        non_member_get = self.client.get(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.non_member_token),
        )
        self.assertEqual(non_member_get.status_code, 403)
        self.assertEqual(non_member_get.json()["detail"], "You are not a member of this project")

        non_member_post = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.non_member_token),
            json={"comment": "Unauthorized comment"},
        )
        self.assertEqual(non_member_post.status_code, 403)

        # Other organization member trying to access
        other_org_get = self.client.get(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.other_token),
        )
        self.assertEqual(other_org_get.status_code, 404)
        self.assertEqual(other_org_get.json()["detail"], "Task not found")

        other_org_post = self.client.post(
            f"/api/v1/tasks/{self.task_id}/comments",
            headers=self._headers(self.other_token),
            json={"comment": "Cross-tenant comment"},
        )
        self.assertEqual(other_org_post.status_code, 404)


if __name__ == "__main__":
    unittest.main()
