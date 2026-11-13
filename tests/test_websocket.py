import unittest
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password, create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.organization import Organization
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.services.websocket_manager import manager


class WebSocketApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.suffix = uuid.uuid4().hex[:12]
        cls.password = "test-password-1"

        # Owner
        cls.owner = cls._register(
            f"Owner {cls.suffix}",
            f"ws-owner-{cls.suffix}@example.com",
            f"WS Org {cls.suffix}",
        )
        cls.owner_token = cls._login(cls.owner["email"])

        # Project
        res = cls.client.post(
            "/api/v1/projects/",
            headers=cls._headers(cls.owner_token),
            json={"name": "WS Project"},
        )
        cls.project_id = res.json()["id"]

        # Member
        cls.member = cls._add_user(
            f"Member {cls.suffix}",
            f"ws-member-{cls.suffix}@example.com",
            cls.owner["organization_id"],
            member_of=cls.project_id,
        )
        cls.member_token = cls._login(cls.member["email"])

        # Inactive User
        cls.inactive = cls._add_user(
            f"Inactive {cls.suffix}",
            f"ws-inactive-{cls.suffix}@example.com",
            cls.owner["organization_id"],
            active=False,
        )
        cls.inactive_token = create_access_token(cls.inactive["id"])

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
    def _add_user(cls, name: str, email: str, org_id: int, active: bool = True, member_of: int | None = None) -> dict:
        db = SessionLocal()
        try:
            user = User(
                organization_id=org_id,
                name=name,
                email=email,
                password_hash=hash_password(cls.password),
                role="employee",
                is_active=active,
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

    def test_valid_websocket_connection(self):
        with self.client.websocket_connect(f"/api/v1/ws/notifications?token={self.member_token}") as websocket:
            self.assertIsNotNone(websocket)

    def test_invalid_and_expired_tokens(self):
        # Invalid token
        with self.assertRaises(Exception):
            with self.client.websocket_connect("/api/v1/ws/notifications?token=invalidtoken"):
                pass

        # Expired token
        expired_payload = {
            "sub": str(self.member["id"]),
            "exp": datetime.now(timezone.utc) - timedelta(minutes=10),
            "type": "access"
        }
        import jwt
        from app.core.config import settings
        expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        with self.assertRaises(Exception):
            with self.client.websocket_connect(f"/api/v1/ws/notifications?token={expired_token}"):
                pass

    def test_inactive_user_rejection(self):
        with self.assertRaises(Exception):
            with self.client.websocket_connect(f"/api/v1/ws/notifications?token={self.inactive_token}"):
                pass

    def test_notification_delivery_via_websocket(self):
        with self.client.websocket_connect(f"/api/v1/ws/notifications?token={self.member_token}") as ws1:
            # Trigger task assignment to member
            res = self.client.post(
                f"/api/v1/projects/{self.project_id}/tasks/",
                headers=self._headers(self.owner_token),
                json={
                    "title": "WebSocket Live Task",
                    "assigned_to": self.member["id"],
                    "status": "todo",
                    "priority": "high"
                },
            )
            self.assertEqual(res.status_code, 201)

            # Receive event on ws1
            data1 = ws1.receive_json()
            self.assertEqual(data1["event"], "notification.created")
            self.assertEqual(data1["notification"]["title"], "New Task Assigned")

    def test_organization_isolation(self):
        other_owner = self._register(
            f"Other Owner {self.suffix}",
            f"ws-other-{self.suffix}@example.com",
            f"Other WS Org {self.suffix}",
        )
        other_token = self._login(other_owner["email"])

        with self.client.websocket_connect(f"/api/v1/ws/notifications?token={other_token}") as ws_other:
            # Verify other user is in manager
            self.assertIn(other_owner["id"], manager.active_connections)
            # Ensure member (different org) is not notified or mixed up
            self.assertNotIn(self.member["id"], manager.active_connections)

    @classmethod
    def tearDownClass(cls):
        db = SessionLocal()
        try:
            org_ids = [cls.owner["organization_id"]]
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
