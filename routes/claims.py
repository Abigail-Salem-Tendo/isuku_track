from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity, get_jwt
from extensions import db
from models.claims import Claim
from models.user import User
from models.zone import Zone
from utils.auth_helpers import role_required
from datetime import datetime, timezone

claims_bp = Blueprint("claims", __name__)


# --- GET: All category enums (claim, suggestion, rejection) ---
@claims_bp.route("/categories", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_categories():
    return jsonify({
        "claim": [
            {"value": "missed_collection", "label": "Missed Collection"},
            {"value": "overflow", "label": "Overflow"},
            {"value": "illegal_dumping", "label": "Illegal Dumping"},
            {"value": "damaged_infrastructure", "label": "Damaged Infrastructure"},
            {"value": "environmental_hazard", "label": "Environmental Hazard"},
            {"value": "other", "label": "Other"},
        ],
        "suggestion": [
            {"value": "no_issues", "label": "No Issues"},
            {"value": "route_optimization", "label": "Route Optimization"},
            {"value": "vehicle_issues", "label": "Vehicle Issues"},
            {"value": "resident_disputes", "label": "Resident Disputes"},
            {"value": "staffing_concerns", "label": "Staffing Concerns"},
            {"value": "infrastructure_needs", "label": "Infrastructure Needs"},
        ],
        "rejection": [
            {"value": "insufficient_evidence", "label": "Insufficient Evidence"},
            {"value": "duplicate_claim", "label": "Duplicate Claim"},
            {"value": "not_in_zone", "label": "Not In Zone"},
            {"value": "false_claim", "label": "False Claim"},
            {"value": "resolved_already", "label": "Already Resolved"},
            {"value": "other", "label": "Other"},
        ],
    }), 200


# Helper function to apply date filters to a query
def apply_date_filters(query):
    date_from = request.args.get("from")
    if date_from:
        try:
            from_dt = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Claim.reported_at >= from_dt)
        except ValueError:
            return None, jsonify({"error": "Invalid 'from' date format. Use YYYY-MM-DD"}), 400

    date_to = request.args.get("to")
    if date_to:
        try:
            to_dt = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(Claim.reported_at <= to_dt)
        except ValueError:
            return None, jsonify({"error": "Invalid 'to' date format. Use YYYY-MM-DD"}), 400

    return query, None, None


# --- CREATE: Resident submits a claim ---
@claims_bp.route("/", methods=["POST"])
@role_required("resident")
def create_claim():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.zone_id:
        return jsonify({"error": "You must be assigned to a zone to submit a claim"}), 400

    # Validate required fields
    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Description is required"}), 400

    photo_url = (data.get("photo_url") or "").strip()
    if not photo_url:
        return jsonify({"error": "Photo is required for claims"}), 400

    claim_category = data.get("claim_category")
    valid_categories = [
        "missed_collection", "overflow", "illegal_dumping",
        "damaged_infrastructure", "environmental_hazard", "other"
    ]
    if claim_category not in valid_categories:
        return jsonify({"error": f"Invalid claim category. Must be one of: {', '.join(valid_categories)}"}), 400

    claim = Claim(
        user_id=user.id,
        zone_id=user.zone_id,
        type="claim",
        description=description,
        photo_url=photo_url,
        claim_category=claim_category
    )

    try:
        db.session.add(claim)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to submit claim"}), 500

    return jsonify({
        "message": "Claim submitted successfully",
        "claim": claim.to_dict()
    }), 201


# --- CREATE: Zone operator submits a suggestion ---
@claims_bp.route("/suggestions", methods=["POST"])
@role_required("zone_operator")
def create_suggestion():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_id = get_jwt_identity()

    # Auto-set zone from ZO's assigned zone
    zone = Zone.query.filter_by(zone_operator_id=user_id).first()
    if not zone:
        return jsonify({"error": "You are not assigned to any zone"}), 400

    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Description is required"}), 400

    suggestion_category = data.get("suggestion_category")
    valid_categories = [
        "no_issues", "route_optimization", "vehicle_issues",
        "resident_disputes", "staffing_concerns", "infrastructure_needs"
    ]
    if suggestion_category not in valid_categories:
        return jsonify({"error": f"Invalid suggestion category. Must be one of: {', '.join(valid_categories)}"}), 400

    from datetime import date as date_type
    period_from = None
    period_to = None
    if data.get("period_from"):
        try:
            period_from = datetime.strptime(data["period_from"], "%Y-%m-%d").date()
        except ValueError:
            pass
    if data.get("period_to"):
        try:
            period_to = datetime.strptime(data["period_to"], "%Y-%m-%d").date()
        except ValueError:
            pass

    suggestion = Claim(
        user_id=int(user_id),
        zone_id=zone.id,
        type="suggestion",
        description=description,
        suggestion_category=suggestion_category,
        period_from=period_from,
        period_to=period_to
    )

    try:
        db.session.add(suggestion)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to submit suggestion"}), 500

    return jsonify({
        "message": "Suggestion submitted successfully",
        "suggestion": suggestion.to_dict()
    }), 201


# --- READ: List claims/suggestions (scoped by role, filterable) ---
@claims_bp.route("/", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_claims():
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    query = Claim.query

    # Scope by role
    if role == "resident":
        query = query.filter_by(user_id=user_id)
    elif role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify([]), 200
        # ZO sees claims in their zone + their own suggestions
        query = query.filter(
            db.or_(
                db.and_(Claim.zone_id == zone.id, Claim.type == "claim"),
                db.and_(Claim.user_id == int(user_id), Claim.type == "suggestion")
            )
        )
    # Admin sees everything — no filter

    # Optional filters from query params
    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter_by(status=status_filter)

    type_filter = request.args.get("type")
    if type_filter:
        query = query.filter_by(type=type_filter)

    zone_filter = request.args.get("zone_id", type=int)
    if zone_filter:
        query = query.filter_by(zone_id=zone_filter)

    category_filter = request.args.get("claim_category")
    if category_filter:
        query = query.filter_by(claim_category=category_filter)

    suggestion_category_filter = request.args.get("suggestion_category")
    if suggestion_category_filter:
        query = query.filter_by(suggestion_category=suggestion_category_filter)

    query, error, status = apply_date_filters(query)
    if error:
        return error, status

    claims = query.order_by(Claim.reported_at.desc()).all()
    return jsonify([c.to_dict() for c in claims]), 200


# --- READ: Claim stats (counts by status, scoped by role) ---
@claims_bp.route("/stats", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_claim_stats():
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    query = Claim.query

    if role == "resident":
        query = query.filter_by(user_id=user_id, type="claim")
    elif role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify({"open": 0, "under_review": 0, "approved": 0, "rejected": 0}), 200
        query = query.filter_by(zone_id=zone.id, type="claim")
    # Admin sees all claims (not suggestions in stats)
    else:
        query = query.filter_by(type="claim")

    query, error, status = apply_date_filters(query)
    if error:
        return error, status

    claims = query.all()
    stats = {"open": 0, "under_review": 0, "approved": 0, "rejected": 0}
    for c in claims:
        if c.status in stats:
            stats[c.status] += 1

    return jsonify(stats), 200


# --- READ: Single claim ---
@claims_bp.route("/<int:id>", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_claim(id):
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    claim = Claim.query.get_or_404(id)

    # Visibility check
    if role == "resident" and claim.user_id != int(user_id):
        return jsonify({"error": "You can only view your own claims"}), 403
    elif role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify({"error": "You are not assigned to any zone"}), 403
        if claim.type == "claim" and claim.zone_id != zone.id:
            return jsonify({"error": "This claim is not in your zone"}), 403
        if claim.type == "suggestion" and claim.user_id != int(user_id):
            return jsonify({"error": "You can only view your own suggestions"}), 403

    return jsonify(claim.to_dict()), 200


# --- UPDATE: ZO sets claim to under_review ---
@claims_bp.route("/<int:id>/review", methods=["PUT"])
@role_required("zone_operator")
def review_claim(id):
    user_id = get_jwt_identity()

    claim = Claim.query.get_or_404(id)

    # Only claims can be reviewed, not suggestions
    if claim.type != "claim":
        return jsonify({"error": "Suggestions cannot be reviewed"}), 400

    # ZO can only review claims in their zone
    zone = Zone.query.filter_by(zone_operator_id=user_id).first()
    if not zone or claim.zone_id != zone.id:
        return jsonify({"error": "This claim is not in your zone"}), 403

    if claim.status != "open":
        return jsonify({"error": f"Only open claims can be reviewed. Current status: {claim.status}"}), 400

    claim.status = "under_review"

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to update claim"}), 500

    return jsonify({
        "message": "Claim is now under review",
        "claim": claim.to_dict()
    }), 200


# --- UPDATE: ZO approves a claim ---
@claims_bp.route("/<int:id>/approve", methods=["PUT"])
@role_required("zone_operator")
def approve_claim(id):
    user_id = get_jwt_identity()

    claim = Claim.query.get_or_404(id)

    if claim.type != "claim":
        return jsonify({"error": "Suggestions cannot be approved"}), 400

    zone = Zone.query.filter_by(zone_operator_id=user_id).first()
    if not zone or claim.zone_id != zone.id:
        return jsonify({"error": "This claim is not in your zone"}), 403

    if claim.status != "under_review":
        if claim.status == "approved":
            return jsonify({"error": "This claim has already been approved.", "status": claim.status}), 400
        elif claim.status == "rejected":
            return jsonify({"error": "This claim has already been rejected.", "status": claim.status}), 400
        else:
            return jsonify({"error": f"Only claims under review can be approved. Current status: {claim.status}.", "status": claim.status}), 400

    # Award points based on category
    points_map = current_app.config.get("POINTS_PER_CATEGORY", {})
    points = points_map.get(claim.claim_category, 5)

    claim.status = "approved"
    claim.resolved_at = datetime.now(timezone.utc)
    claim.resolved_by = int(user_id)
    claim.points_awarded = points

    # Add points to the resident's loyalty_points
    resident = User.query.get(claim.user_id)
    if resident:
        resident.loyalty_points = (resident.loyalty_points or 0) + points

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to approve claim"}), 500

    return jsonify({
        "message": f"Claim approved. {points} points awarded.",
        "claim": claim.to_dict()
    }), 200


# --- UPDATE: ZO rejects a claim ---
@claims_bp.route("/<int:id>/reject", methods=["PUT"])
@role_required("zone_operator")
def reject_claim(id):
    user_id = get_jwt_identity()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    claim = Claim.query.get_or_404(id)

    if claim.type != "claim":
        return jsonify({"error": "Suggestions cannot be rejected"}), 400

    zone = Zone.query.filter_by(zone_operator_id=user_id).first()
    if not zone or claim.zone_id != zone.id:
        return jsonify({"error": "This claim is not in your zone"}), 403

    if claim.status != "under_review":
        if claim.status == "approved":
            return jsonify({"error": "This claim has already been approved.", "status": claim.status}), 400
        elif claim.status == "rejected":
            return jsonify({"error": "This claim has already been rejected.", "status": claim.status}), 400
        else:
            return jsonify({"error": f"Only claims under review can be rejected. Current status: {claim.status}.", "status": claim.status}), 400

    # Rejection requires both category and detail
    rejection_category = data.get("rejection_category")
    valid_rejections = [
        "insufficient_evidence", "duplicate_claim", "not_in_zone",
        "false_claim", "resolved_already", "other"
    ]
    if rejection_category not in valid_rejections:
        return jsonify({"error": f"Invalid rejection category. Must be one of: {', '.join(valid_rejections)}"}), 400

    rejection_detail = (data.get("rejection_detail") or "").strip()
    if not rejection_detail:
        return jsonify({"error": "Rejection detail is required"}), 400

    claim.status = "rejected"
    claim.resolved_at = datetime.now(timezone.utc)
    claim.resolved_by = int(user_id)
    claim.rejection_category = rejection_category
    claim.rejection_detail = rejection_detail

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to reject claim"}), 500

    return jsonify({
        "message": "Claim rejected",
        "claim": claim.to_dict()
    }), 200


# --- DELETE: Cancel own claim/suggestion (only if open) ---
@claims_bp.route("/<int:id>", methods=["DELETE"])
@role_required("resident", "zone_operator")
def delete_claim(id):
    user_id = get_jwt_identity()

    claim = Claim.query.get_or_404(id)

    # Can only delete your own
    if claim.user_id != int(user_id):
        return jsonify({"error": "You can only cancel your own claims"}), 403

    # Can only delete if still open
    if claim.status != "open":
        return jsonify({"error": f"Cannot cancel a claim with status: {claim.status}"}), 400

    try:
        db.session.delete(claim)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to cancel claim"}), 500

    return jsonify({"message": "Claim cancelled successfully"}), 200
