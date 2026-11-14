import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import BackgroundTasks

from app.core.config import settings
from app.services.email_templates import (
    get_task_assignment_email_template,
    get_task_reassignment_email_template,
)

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> None:
    """
    Sends an email using SMTP configuration.
    Handles SMTP failures gracefully by catching exceptions and logging errors.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent successfully to %s", to_email)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)


def queue_task_assignment_email(
    background_tasks: BackgroundTasks | None,
    to_email: str,
    assignee_name: str,
    task_title: str,
    task_id: int,
    project_name: str,
) -> None:
    subject, body = get_task_assignment_email_template(
        task_title=task_title,
        task_id=task_id,
        project_name=project_name,
        assignee_name=assignee_name,
    )
    if background_tasks is not None:
        background_tasks.add_task(send_email, to_email, subject, body)
    else:
        # If no background tasks context (e.g. background execution or tests), send directly or mock
        send_email(to_email, subject, body)


def queue_task_reassignment_email(
    background_tasks: BackgroundTasks | None,
    to_email: str,
    assignee_name: str,
    task_title: str,
    task_id: int,
    project_name: str,
) -> None:
    subject, body = get_task_reassignment_email_template(
        task_title=task_title,
        task_id=task_id,
        project_name=project_name,
        assignee_name=assignee_name,
    )
    if background_tasks is not None:
        background_tasks.add_task(send_email, to_email, subject, body)
    else:
        send_email(to_email, subject, body)
