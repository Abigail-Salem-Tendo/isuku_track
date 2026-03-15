from functools import wraps
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
