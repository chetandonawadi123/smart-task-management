def get_task_assignment_email_template(
    task_title: str,
    task_id: int,
    project_name: str,
    assignee_name: str,
) -> tuple[str, str]:
    subject = f"Task Assigned: {task_title}"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Task Assigned</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f5f7; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e1e4e8; }}
            .header {{ background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold; }}
            .content {{ padding: 30px; }}
            .task-card {{ background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ background-color: #f8fafc; color: #64748b; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e1e4e8; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                Smart Task Management
            </div>
            <div class="content">
                <p>Hello <strong>{assignee_name}</strong>,</p>
                <p>You have been assigned to a new task in project <strong>{project_name}</strong>.</p>

                <div class="task-card">
                    <p style="margin: 0 0 8px 0;"><strong>Task:</strong> {task_title}</p>
                    <p style="margin: 0;"><strong>Task ID:</strong> #{task_id}</p>
                </div>

                <p>Please log in to Smart Task Management to view details and update your progress.</p>
            </div>
            <div class="footer">
                <p>&copy; Smart Task Management. This is an automated notification, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return subject, body


def get_task_reassignment_email_template(
    task_title: str,
    task_id: int,
    project_name: str,
    assignee_name: str,
) -> tuple[str, str]:
    subject = f"Task Reassigned: {task_title}"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Task Reassigned</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f5f7; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e1e4e8; }}
            .header {{ background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; font-size: 20px; font-weight: bold; }}
            .content {{ padding: 30px; }}
            .task-card {{ background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ background-color: #f8fafc; color: #64748b; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e1e4e8; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                Smart Task Management
            </div>
            <div class="content">
                <p>Hello <strong>{assignee_name}</strong>,</p>
                <p>The task <strong>{task_title}</strong> in project <strong>{project_name}</strong> has been reassigned to you.</p>

                <div class="task-card">
                    <p style="margin: 0 0 8px 0;"><strong>Task:</strong> {task_title}</p>
                    <p style="margin: 0;"><strong>Task ID:</strong> #{task_id}</p>
                </div>

                <p>Please log in to Smart Task Management to view details and update your progress.</p>
            </div>
            <div class="footer">
                <p>&copy; Smart Task Management. This is an automated notification, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return subject, body
