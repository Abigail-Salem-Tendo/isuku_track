from flask_mail import Message
from extensions import mail
from flask import current_app

# Helper function to send emails
def send_email(to, subject, body):
    try:
        msg = Message(subject=subject, recipients=[to], html=body)
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to}: {str(e)}")
        return False

# Welcome email after registration
def send_welcome_email(username, email):
    send_email(
        to=email,
        subject=f"{username}, Welcome to IsukuTrack!",
        body=f"""
        <h2>Welcome to IsukuTrack, {username}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now log in and start reporting waste management issues in your zone.</p>
        <br>
        <p>— IsukuTrack Team</p>
        """
    )

# Zone Operator setup email
def send_zo_setup_email(username, email, reset_link):
    send_email(
        to=email,
        subject="Your IsukuTrack zone operator account has been created",
        body=f"""
        <h2>Hello {username},</h2>
        <p>An administrator has created a Zone Operator account for you on IsukuTrack.</p>
        <p>Please set your password by clicking the link below:</p>
        <p><a href="{reset_link}" style="background:#2e7d52;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Set Your Password</a></p>
        <p>This link expires in 30 minutes.</p>
        <br>
        <p>— IsukuTrack Team</p>
        """
    )

# Password reset email
def send_reset_email(username, email, reset_link):
    send_email(
        to=email,
        subject=f"IsukuTrack — Password Reset for {username}",
        body=f"""
        <h2>Hi {username},</h2>
        <p>We received a request to reset your password.</p>
        <p><a href="{reset_link}" style="background:#2e7d52;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a></p>
        <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
        <br>
        <p>— IsukuTrack Team</p>
        """
    )

# Password change confirmation email
def send_password_changed_email(username, email):
    send_email(
        to=email,
        subject="IsukuTrack — Password Changed",
        body=f"""
        <h2>Hi {username},</h2>
        <p>Your password has been changed successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <br>
        <p>— IsukuTrack Team</p>
        """
    )
