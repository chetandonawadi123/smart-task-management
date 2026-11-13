import unittest
import uuid
from datetime import datetime, timedelta, timezone

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


class DashboardApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"

        # Org 1
        cls.owner = cls._register(
            f"Owner {cls.suffix}",
            f"dash-owner-{cls.suffix}@example.com",
            f"Dash Org {cls.suffix}",
        )
        cls.owner_token = cls._login(cls.owner["email"])

        # Org 2 (Isolation)
        cls.other_org = cls._register(
            f"Other {cls.suffix}",
            f"dash-other-{cls.suffix}@example.com",
            f"Other Dash Org {cls.suffix}",
        )
        cls.other_token = cls._login(cls.other_org["email"])

        # Create Project in Org 1
        proj_res = cls.client.post(
            "/api/v1/projects/",
            headers=cls._headers(cls.owner_token),
            json={"name": "Dash Project"},
        )
        cls.project_id = proj_res.json()["id"]

        # Create Member in Org 1
        cls.member = cls._add_user(
            f"Member {cls.suffix}",
            f"dash-member-{cls.suffix}@example.com",
            cls.owner["organization_id"],
            member_of=cls.project_id,
        )
        cls.member_token = cls._login(cls.member["email"])

        # Create Tasks in Org 1
        cls._create_task("Task 1", "done", "high", cls.member["id"], cls.owner_token)
        cls._create_task("Task 2", "in_progress", "medium", cls.member["id"], cls.owner_token)
        cls._create_task("Task 3", "todo", "low", None, cls.owner_token)
        cls._create_task("Task 4", "todo", "critical", None, cls.owner_token, overdue=True)

        # Create Comment in Org 1
        cls.client.post(
            f"/api/v1/tasks/{1}/comments", # Approximate ID, will work in fresh DB or we find actual
            headers=cls._headers(cls.owner_token),
            json={"comment": "Test comment"},
        )

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

    @classmethod
    def _create_task(cls, title, status, priority, assigned_to, token, overdue=False):
        due_date = None
        if overdue:
            due_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

        res = cls.client.post(
            f"/api/v1/projects/{cls.project_id}/tasks/",
            headers=cls._headers(token),
            json={
                "title": title,
                "status": status,
                "priority": priority,
                "assigned_to": assigned_to,
                "due_date": due_date
            },
        )
        return res.json()

    @staticmethod
    def _headers(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def test_dashboard_overview(self):
        res = self.client.get("/api/v1/dashboard/overview", headers=self._headers(self.owner_token))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_projects"], 1)
        self.assertEqual(data["total_tasks"], 4)
        self.assertEqual(data["completed_tasks"], 1)
        self.assertEqual(data["in_progress_tasks"], 1)
        self.assertEqual(data["overdue_tasks"], 1)
        self.assertEqual(data["unassigned_tasks"], 2)
        self.assertEqual(data["completion_percentage"], 25.0)

    def test_task_analytics(self):
        res = self.client.get("/api/v1/dashboard/task-analytics", headers=self._headers(self.owner_token))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(any(s["status"] == "done" and s["count"] == 1 for s in data["by_status"]))
        self.assertTrue(any(p["priority"] == "critical" and p["count"] == 1 for p in data["by_priority"]))
        self.assertEqual(data["completed_vs_pending"]["completed"], 1)
        self.assertEqual(data["completed_vs_pending"]["pending"], 3)

    def test_project_analytics(self):
        res = self.client.get("/api/v1/dashboard/project-analytics", headers=self._headers(self.owner_token))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_projects"], 1)
        self.assertEqual(data["projects"][0]["project_name"], "Dash Project")
        self.assertEqual(data["projects"][0]["total_tasks"], 4)

    def test_team_analytics(self):
        res = self.client.get("/api/v1/dashboard/team-analytics", headers=self._headers(self.owner_token))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Should have at least owner and member
        self.assertGreaterEqual(len(data["members"]), 2)
        member_stats = next(m for m in data["members"] if m["user_id"] == self.member["id"])
        self.assertEqual(member_stats["assigned_task_count"], 2)

    def test_recent_activity(self):
        res = self.client.get("/api/v1/dashboard/recent-activity", headers=self._headers(self.owner_token), params={"limit": 5})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data["items"]), 4)
        self.assertEqual(data["limit"], 5)

    def test_organization_isolation(self):
        # Empty org should have 0s
        res = self.client.get("/api/v1/dashboard/overview", headers=self._headers(self.other_token))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_projects"], 0)
        self.assertEqual(data["total_tasks"], 0)
        self.assertEqual(data["completion_percentage"], 0.0)

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            org_ids = [cls.owner["organization_id"], cls.other_org["organization_id"]]

            # Delete in order
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
