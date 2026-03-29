from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from models.claims import Claim
from models.payment import Payment
from models.schedule import Schedule
from models.zone import Zone
from models.user import User
from utils.auth_helpers import role_required
from datetime import datetime, timezone, timedelta

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_notifications():
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role")

    if role == "resident":
        return _resident_notifications(user_id)
    elif role == "zone_operator":
        return _zo_notifications(user_id)
    else:
        return _admin_notifications()


# ── Resident: own claim/payment statuses + upcoming schedules ──────────────────
def _resident_notifications(user_id):
    items = []

    # Claims: approved (with points) or rejected (with reason)
    claims = Claim.query.filter(
        Claim.user_id == user_id,
        Claim.type == "claim",
        Claim.status.in_(["approved", "rejected"])
    ).all()

    for c in claims:
        cat = c.claim_category.replace("_", " ").title()
        if c.status == "approved":
            title = "Claim Approved"
            pts = c.points_awarded or 0
            message = f"Your {cat} claim was approved. You earned {pts} point{'s' if pts != 1 else ''}."
        else:
            title = "Claim Rejected"
            reason = c.rejection_detail or "No reason provided"
            message = f"Your {cat} claim was rejected. Reason: {reason}"

        items.append({
            "id": f"claim_{c.id}",
            "type": f"claim_{c.status}",
            "title": title,
            "message": message,
            "date": c.resolved_at.isoformat() if c.resolved_at else c.reported_at.isoformat(),
            "reference_id": c.id,
            "reference_type": "claim"
        })

    # Payments: approved or rejected (with reason)
    payments = Payment.query.filter(
        Payment.resident_id == user_id,
        Payment.status.in_(["approved", "rejected"])
    ).all()

    for p in payments:
        month_name = datetime(2000, p.payment_month, 1).strftime("%B")
        if p.status == "approved":
            title = "Payment Approved"
            message = f"Your payment of {int(p.amount):,} {p.currency} for {month_name} {p.payment_year} was approved."
        else:
            title = "Payment Rejected"
            reason = p.rejection_reason or "No reason provided"
            message = f"Your {month_name} {p.payment_year} payment was rejected. Reason: {reason}"

        items.append({
            "id": f"payment_{p.id}",
            "type": f"payment_{p.status}",
            "title": title,
            "message": message,
            "date": p.reviewed_at.isoformat() if p.reviewed_at else p.submitted_at.isoformat(),
            "reference_id": p.id,
            "reference_type": "payment"
        })

    # Upcoming schedules in resident's zone (next 7 days, not started yet)
    user = User.query.get(user_id)
    if user and user.zone_id:
        now = datetime.now(timezone.utc)
        week_ahead = now + timedelta(days=7)
        upcoming = Schedule.query.filter(
            Schedule.zone_id == user.zone_id,
            Schedule.status == "not_started",
            Schedule.date_time_start >= now,
            Schedule.date_time_start <= week_ahead
        ).all()

        for s in upcoming:
            date_str = s.date_time_start.strftime("%A, %b %d at %I:%M %p")
            items.append({
                "id": f"schedule_{s.id}",
                "type": "schedule_upcoming",
                "title": "Upcoming Collection",
                "message": f"Waste collection is scheduled for your zone on {date_str}.",
                "date": s.created_at.isoformat(),
                "reference_id": s.id,
                "reference_type": "schedule"
            })

    items.sort(key=lambda x: x["date"], reverse=True)
    return jsonify(items), 200


# ── Zone Operator: incoming claims, payments, upcoming schedules ───────────────
def _zo_notifications(user_id):
    items = []
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    zone = Zone.query.filter_by(zone_operator_id=user_id).first()
    if not zone:
        return jsonify([]), 200

    # New open claims in zone (submitted in last 7 days)
    new_claims = Claim.query.filter(
        Claim.zone_id == zone.id,
        Claim.type == "claim",
        Claim.status == "open",
        Claim.reported_at >= week_ago
    ).all()

    for c in new_claims:
        cat = c.claim_category.replace("_", " ").title()
        items.append({
            "id": f"claim_{c.id}",
            "type": "claim_incoming",
            "title": "New Claim Submitted",
            "message": f"A resident submitted a {cat} claim in your zone. Action required.",
            "date": c.reported_at.isoformat(),
            "reference_id": c.id,
            "reference_type": "claim"
        })

    # Pending payments in zone (submitted in last 7 days)
    new_payments = Payment.query.filter(
        Payment.zone_id == zone.id,
        Payment.status == "pending",
        Payment.submitted_at >= week_ago
    ).all()

    for p in new_payments:
        month_name = datetime(2000, p.payment_month, 1).strftime("%B")
        items.append({
            "id": f"payment_{p.id}",
            "type": "payment_incoming",
            "title": "New Payment to Review",
            "message": f"A resident submitted a payment of {int(p.amount):,} {p.currency} for {month_name} {p.payment_year}.",
            "date": p.submitted_at.isoformat(),
            "reference_id": p.id,
            "reference_type": "payment"
        })

    # Upcoming schedules for this zone (next 7 days)
    week_ahead = now + timedelta(days=7)
    upcoming = Schedule.query.filter(
        Schedule.zone_id == zone.id,
        Schedule.status == "not_started",
        Schedule.date_time_start >= now,
        Schedule.date_time_start <= week_ahead
    ).all()

    for s in upcoming:
        date_str = s.date_time_start.strftime("%A, %b %d at %I:%M %p")
        items.append({
            "id": f"schedule_{s.id}",
            "type": "schedule_upcoming",
            "title": "Upcoming Collection",
            "message": f"You have a collection scheduled for {zone.name} on {date_str}.",
            "date": s.created_at.isoformat(),
            "reference_id": s.id,
            "reference_type": "schedule"
        })

    items.sort(key=lambda x: x["date"], reverse=True)
    return jsonify(items), 200


# ── Admin: schedule status updates by ZO + new ZO suggestions ─────────────────
def _admin_notifications():
    items = []
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # Schedule status updates (ongoing or completed in last 7 days)
    updated_schedules = Schedule.query.filter(
        Schedule.status.in_(["ongoing", "completed"]),
        Schedule.date_time_start >= week_ago
    ).all()

    for s in updated_schedules:
        zone = Zone.query.get(s.zone_id)
        zone_name = zone.name if zone else f"Zone {s.zone_id}"

        if s.status == "ongoing":
            title = "Collection Underway"
            date_str = s.date_time_start.strftime("%b %d at %I:%M %p")
            message = f"{zone_name}: waste collection is currently ongoing (started {date_str})."
            notif_date = s.date_time_start
        else:
            title = "Collection Completed"
            end_str = s.date_time_end.strftime("%b %d at %I:%M %p") if s.date_time_end else "recently"
            message = f"{zone_name}: waste collection was completed on {end_str}."
            notif_date = s.date_time_end or s.date_time_start

        items.append({
            "id": f"schedule_{s.id}",
            "type": f"schedule_{s.status}",
            "title": title,
            "message": message,
            "date": notif_date.isoformat(),
            "reference_id": s.id,
            "reference_type": "schedule"
        })

    # New ZO suggestions/reports (open, submitted in last 7 days)
    suggestions = Claim.query.filter(
        Claim.type == "suggestion",
        Claim.status == "open",
        Claim.reported_at >= week_ago
    ).all()

    for s in suggestions:
        zone = Zone.query.get(s.zone_id)
        zone_name = zone.name if zone else f"Zone {s.zone_id}"
        cat = (s.suggestion_category or "general").replace("_", " ").title()

        items.append({
            "id": f"suggestion_{s.id}",
            "type": "suggestion_new",
            "title": "New ZO Report",
            "message": f"{zone_name} operator submitted a {cat} report. Review required.",
            "date": s.reported_at.isoformat(),
            "reference_id": s.id,
            "reference_type": "suggestion"
        })

    items.sort(key=lambda x: x["date"], reverse=True)
    return jsonify(items), 200
