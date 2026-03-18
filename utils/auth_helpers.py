from functools import wraps
import re
from flask import jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

# Custom decorator to check if the user has the required role(s) to access a route
def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # First, verify that the JWT is present and valid in the request
            verify_jwt_in_request()

            # Get the claims from the JWT, which should include the user's role
            claims = get_jwt()
            user_role = claims.get("role")

            # Check if the user's role is authorized to access the route
            if user_role not in allowed_roles:
                return jsonify({"error": "You do not have permission to access this resource"}), 403

            # If the role is authorized, proceed to the original route function
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def validate_username(username, check_duplicate=True):
    # Validate username: required, length, and check for duplicates.
    if not username or not username.strip():
        return "Username is required"

    username = username.strip()

    if len(username) < 3 or len(username) > 50:
        return "Username must be 3-50 characters"

    if check_duplicate:
        from models.user import User
        if User.query.filter_by(username=username).first():
            return "Username already taken"

    return None


def validate_email(email, check_duplicate=True):
    # Validate email: required, format, and optionally check for duplicates.
    if not email or not email.strip():
        return "Email is required"

    email = email.strip().lower()
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

    if not re.match(pattern, email):
        return "Invalid email format"

    if check_duplicate:
        from models.user import User
        if User.query.filter_by(email=email).first():
            return "Email already registered"

    return None


def validate_password(password):
    # Validate password: required, length, and complexity.
    if not password:
        return "Password is required"
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return "Password must contain at least one number"
    return None


def validate_phone(phone, required=False, check_duplicate=False):
    # Validate phone number: optional or required, format, and optionally check for duplicates.
    if not phone or not phone.strip():
        if required:
            return "Phone number is required"
        return None

    phone = phone.strip()
    pattern = r"^(\+250|0)(78|73|72)\d{7}$"

    if not re.match(pattern, phone):
        return "Phone number must start with 078, 073, 072 or +25078, +25073, +25072 followed by 7 digits"

    if check_duplicate:
        from models.user import User
        if User.query.filter_by(phone_number=phone).first():
            return "Phone number already registered"

    return None


def generate_reset_token(email):
    # Generate a password reset token for the given email
    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    return s.dumps(email, salt="password-reset")


def verify_reset_token(token, max_age=1800):
    # Verify the token and return the email if valid, or None if invalid/expired
    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        return s.loads(token, salt="password-reset", max_age=max_age)
    except (SignatureExpired, BadSignature):
        return None
