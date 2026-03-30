from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from extensions import db
from models.claims import Claim
from models.payment import Payment
from models.user import User
from models.zone import Zone
from models.schedule import Schedule
from utils.auth_helpers import role_required
from datetime import datetime

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/zone/<int:zone_id>", methods=["GET"])
@role_required("zone_operator", "admin")
def get_zone_report(zone_id):
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    zone = Zone.query.get_or_404(zone_id)

    # ZO can only see their own zone's report
    if role == "zone_operator" and zone.zone_operator_id != int(user_id):
        return jsonify({"error": "You can only view reports for your own zone"}), 403

    # Parse date range
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if not date_from or not date_to:
        return jsonify({"error": "Both 'from' and 'to' date parameters are required (YYYY-MM-DD)"}), 400

    try:
        from_dt = datetime.strptime(date_from, "%Y-%m-%d")
        to_dt = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    # --- Zone info ---
    zone_info = {
        "id": zone.id,
        "name": zone.name,
        "district": zone.district,
        "sector": zone.sector,
        "cell": zone.cell,
        "village": zone.village,
        "operator": zone.zone_operator.username if zone.zone_operator else None,
        "operator_phone": zone.zone_operator.phone_number if zone.zone_operator else None
    }

    # --- Resident count ---
    resident_count = User.query.filter_by(zone_id=zone_id, role="resident").count()

    # --- Claims stats for the date range ---
    claims_query = Claim.query.filter(
        Claim.zone_id == zone_id,
        Claim.type == "claim",
        Claim.reported_at >= from_dt,
        Claim.reported_at <= to_dt
    )

    claims = claims_query.all()
    claims_stats = {"open": 0, "under_review": 0, "approved": 0, "rejected": 0, "total": len(claims)}
    for c in claims:
        if c.status in claims_stats:
            claims_stats[c.status] += 1

    # Total points awarded in this period
    points_awarded = sum(c.points_awarded or 0 for c in claims if c.status == "approved")

    # --- Schedule stats for the date range ---
    schedules_query = Schedule.query.filter(
        Schedule.zone_id == zone_id,
        Schedule.date_time_start >= from_dt,
        Schedule.date_time_start <= to_dt
    )

    schedules = schedules_query.all()
    schedule_stats = {"completed": 0, "ongoing": 0, "not_started": 0, "total": len(schedules)}
    for s in schedules:
        if s.status in schedule_stats:
            schedule_stats[s.status] += 1

    # --- Payment stats for the date range ---
    payments_query = Payment.query.filter(
        Payment.zone_id == zone_id,
        Payment.submitted_at >= from_dt,
        Payment.submitted_at <= to_dt
    )
    payments = payments_query.all()
    payment_stats = {"pending": 0, "approved": 0, "rejected": 0, "total": len(payments)}
    total_approved_amount = 0.0
    for p in payments:
        if p.status in payment_stats:
            payment_stats[p.status] += 1
        if p.status == "approved":
            total_approved_amount += p.amount or 0

    # --- ZO suggestions for the date range ---
    suggestions = Claim.query.filter(
        Claim.zone_id == zone_id,
        Claim.type == "suggestion",
        Claim.reported_at >= from_dt,
        Claim.reported_at <= to_dt
    ).order_by(Claim.reported_at.desc()).all()

    zo = zone.zone_operator

    return jsonify({
        "report_period": {"from": date_from, "to": date_to},

        "zone": {
            "id": zone.id,
            "name": zone.name,
            "district": zone.district,
            "sector": zone.sector,
            "cell": zone.cell,
            "village": zone.village
        },

        "zone_operator": {
            "name": zo.username if zo else None,
            "phone": zo.phone_number if zo else None,
            "email": zo.email if zo else None
        },

        "resident_count": resident_count,

        "claims": {
            "total": claims_stats["total"],
            "open": claims_stats["open"],
            "under_review": claims_stats["under_review"],
            "approved": claims_stats["approved"],
            "rejected": claims_stats["rejected"]
        },

        "points_awarded": points_awarded,

        "schedules": {
            "total": schedule_stats["total"],
            "completed": schedule_stats["completed"],
            "ongoing": schedule_stats["ongoing"],
            "not_started": schedule_stats["not_started"]
        },

        "payments": {
            "total": payment_stats["total"],
            "approved": payment_stats["approved"],
            "pending": payment_stats["pending"],
            "rejected": payment_stats["rejected"],
            "total_approved_amount": total_approved_amount
        },

        "suggestions": [
            {
                "category": s.suggestion_category,
                "description": s.description,
                "submitted_at": s.reported_at.isoformat() if s.reported_at else None
            }
            for s in suggestions
        ]
    }), 200
