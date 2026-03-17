from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from extensions import db, bcrypt
from models.user import User
from models.zone import Zone
from utils.auth_helpers import (
    role_required, generate_reset_token, verify_reset_token,
    validate_username, validate_email, validate_password, validate_phone
)
import secrets

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a resident user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    # Validate inputs: required, format, and duplicates
    error = (validate_username(data.get("username"))
             or validate_email(data.get("email"))
             or validate_password(data.get("password"))
             or validate_phone(data.get("phone_number"), required=True))
    if error:
        return jsonify({"error": error}), 400

    username = data["username"].strip()
    email = data["email"].strip().lower()
    password = data["password"]
    phone_number = data["phone_number"].strip()
    zone_id = data.get("zone_id")

    # Validate zone exists
    if not zone_id:
        return jsonify({"error": "Zone is required"}), 400
    zone = Zone.query.get(zone_id)
    if not zone:
        return jsonify({"error": "Selected zone does not exist"}), 400

    # Create new user
    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        phone_number=phone_number,
        zone_id=zone_id,
        role="resident"
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create user"}), 500
    
    # Generate tokens
    access_token = create_access_token(
        identity=str(new_user.id),
        additional_claims={"role": new_user.role}
    )
    refresh_token = create_refresh_token(identity=str(new_user.id))
    
    return jsonify({
        "message": "User registered successfully",
        "user": new_user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user and return JWT tokens."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Generate tokens
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    access_token = create_access_token(
        identity=current_user_id,
        additional_claims={"role": user.role}
    )
    
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_current_user():
    # Get logged in user profile
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({"user": user.to_dict()}), 200

@auth_bp.route("/profile", methods=["PUT"])
@role_required("resident", "zone_operator", "admin")
def update_profile():
    # Update logged in user profile information
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    errors = []

    # Editable profile username
    if "username" in data:
        new_username = data["username"].strip()
        error = validate_username(
            data["username"],
            check_duplicate=(new_username != user.username)
        )
        if error:
            errors.append(error)
        else:
            user.username = new_username

    # Editable profile phone_number
    if "phone_number" in data:
        error = validate_phone(
            data["phone_number"],
            required=True,
            check_duplicate=(data["phone_number"].strip() != (user.phone_number or ""))
        )
        if error:
            errors.append(error)
        else:
            user.phone_number = data["phone_number"].strip()

    # Editable profile email
    if "email" in data:
        new_email = data["email"].strip().lower()
        error = validate_email(
            data["email"],
            check_duplicate=(new_email != user.email)
        )
        if error:
            errors.append(error)
        else:
            user.email = new_email

    # Editable profile password
    if "new_password" in data:
        current_password = data.get("current_password", "")
        if not current_password:
            errors.append("Current password is required to set a new password")
        elif not bcrypt.check_password_hash(user.password_hash, current_password):
            errors.append("Current password is incorrect")
        else:
            error = validate_password(data["new_password"])
            if error:
                errors.append(error)
            else:
                user.password_hash = bcrypt.generate_password_hash(data["new_password"]).decode("utf-8")

    # Editable profile zone only for residents
    if "zone_id" in data:
        if user.role != "resident":
            errors.append("Only residents can change their zone")
        else:
            zone = Zone.query.get(data["zone_id"])
            if not zone:
                errors.append("Selected zone does not exist")
            else:
                user.zone_id = data["zone_id"]

    if errors:
        return jsonify({"error": errors[0]}), 400

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to update profile"}), 500

    return jsonify({
        "message": "Profile updated successfully",
        "user": user.to_dict()
    }), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    # Verify identity with email + phone number, then return reset token
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    phone_number = data.get("phone_number", "").strip()

    if not email or not phone_number:
        return jsonify({"error": "Email and phone number are required"}), 400

    # Find user by email
    user = User.query.filter_by(email=email).first()
    if not user or user.phone_number != phone_number:
        return jsonify({"error": "No account matches that email and phone number"}), 404

    # Both match — generate reset token
    token = generate_reset_token(email)

    return jsonify({
        "message": "Identity verified",
        "reset_token": token
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    # Verify reset token and set a new password
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    token = data.get("token", "")
    password = data.get("password", "")

    if not token:
        return jsonify({"error": "Reset token is required"}), 400

    # Verify the token and extract the email
    email = verify_reset_token(token)
    if not email:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    # Validate the new password
    error = validate_password(password)
    if error:
        return jsonify({"error": error}), 400

    # Find user and update password
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to reset password"}), 500

    return jsonify({"message": "Password reset successfully"}), 200


@auth_bp.route("/create-zone-operator", methods=["POST"])
@role_required("admin")
def create_zone_operator():
    """Admin creates a ZO account with a random password, returns a setup token link."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    # Validate inputs: required, format, and duplicates
    error = (validate_username(data.get("username"))
             or validate_email(data.get("email"))
             or validate_phone(data.get("phone_number"), required=True))
    if error:
        return jsonify({"error": error}), 400

    username = data["username"].strip()
    email = data["email"].strip().lower()
    phone_number = data["phone_number"].strip()

    # Generate a random password the ZO will set their own password via the setup link
    random_password = secrets.token_urlsafe(16)
    password_hash = bcrypt.generate_password_hash(random_password).decode("utf-8")

    new_zo = User(
        username=username,
        email=email,
        password_hash=password_hash,
        phone_number=phone_number,
        role="zone_operator"
    )

    try:
        db.session.add(new_zo)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to create zone operator"}), 500

    # Generate a reset token, ZO will reset their own password
    reset_token = generate_reset_token(email)

    return jsonify({
        "message": "Zone operator account created",
        "user": new_zo.to_dict(),
        "reset_token": reset_token,
        "reset_link": f"/reset-password?token={reset_token}"
    }), 201
