from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from extensions import db
from models.payment import Payment, MonthlyPrice
from models.user import User
from models.zone import Zone
from utils.auth_helpers import role_required
from datetime import datetime, timezone, date

payment_bp = Blueprint("payments", __name__)


# ==================== MONTHLY PRICE MANAGEMENT (Admin Only) ====================

@payment_bp.route("/prices", methods=["POST"])
@role_required("admin")
def set_monthly_price():
    """Admin sets monthly payment price for a zone"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    admin_id = get_jwt_identity()

    # Validate required fields
    zone_id = data.get("zone_id")
    if not zone_id:
        return jsonify({"error": "Zone ID is required"}), 400

    zone = Zone.query.get(zone_id)
    if not zone:
        return jsonify({"error": "Zone not found"}), 404

    amount = data.get("amount")
    if not amount or amount <= 0:
        return jsonify({"error": "Valid amount is required"}), 400

    effective_from_str = data.get("effective_from")
    if not effective_from_str:
        return jsonify({"error": "Effective from date is required"}), 400

    try:
        effective_from = datetime.strptime(effective_from_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    effective_to = None
    if data.get("effective_to"):
        try:
            effective_to = datetime.strptime(data.get("effective_to"), "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid effective_to date format. Use YYYY-MM-DD"}), 400

    # End any existing active price for this zone
    existing_prices = MonthlyPrice.query.filter(
        MonthlyPrice.zone_id == zone_id,
        MonthlyPrice.effective_to.is_(None)
    ).all()

    for price in existing_prices:
        price.effective_to = effective_from

    monthly_price = MonthlyPrice(
        zone_id=zone_id,
        amount=amount,
        currency=data.get("currency", "RWF"),
        effective_from=effective_from,
        effective_to=effective_to,
        set_by=int(admin_id)
    )

    try:
        db.session.add(monthly_price)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to set monthly price"}), 500

    return jsonify({
        "message": "Monthly price set successfully",
        "price": monthly_price.to_dict()
    }), 201


@payment_bp.route("/prices", methods=["GET"])
@role_required("admin", "zone_operator", "resident")
def get_monthly_prices():
    """Get monthly prices (admin sees all, zone operator sees their zone, resident sees their zone)"""
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    query = MonthlyPrice.query

    if role == "resident":
        user = User.query.get(user_id)
        if not user or not user.zone_id:
            return jsonify({"error": "You are not assigned to a zone"}), 400
        query = query.filter_by(zone_id=user.zone_id)
    elif role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify([]), 200
        query = query.filter_by(zone_id=zone.id)

    # Optional zone filter for admin
    zone_filter = request.args.get("zone_id", type=int)
    if zone_filter and role == "admin":
        query = query.filter_by(zone_id=zone_filter)

    # Get only active prices by default
    active_only = request.args.get("active", "true").lower() == "true"
    if active_only:
        today = date.today()
        query = query.filter(
            MonthlyPrice.effective_from <= today,
            db.or_(MonthlyPrice.effective_to.is_(None), MonthlyPrice.effective_to >= today)
        )

    prices = query.order_by(MonthlyPrice.created_at.desc()).all()
    return jsonify([p.to_dict() for p in prices]), 200


@payment_bp.route("/prices/current", methods=["GET"])
@role_required("resident")
def get_current_price():
    """Get current monthly price for the resident's zone"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.zone_id:
        return jsonify({"error": "You are not assigned to a zone"}), 400

    today = date.today()
    price = MonthlyPrice.query.filter(
        MonthlyPrice.zone_id == user.zone_id,
        MonthlyPrice.effective_from <= today,
        db.or_(MonthlyPrice.effective_to.is_(None), MonthlyPrice.effective_to >= today)
    ).first()

    if not price:
        return jsonify({"error": "No active price set for your zone"}), 404

    return jsonify(price.to_dict()), 200


# ==================== PAYMENT SUBMISSION (Resident) ====================

@payment_bp.route("/", methods=["POST"])
@role_required("resident")
def submit_payment():
    """Resident submits a monthly payment"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.zone_id:
        return jsonify({"error": "You must be assigned to a zone to make payments"}), 400

    # Validate payment month and year
    payment_month = data.get("payment_month")
    payment_year = data.get("payment_year")

    if not payment_month or not isinstance(payment_month, int) or payment_month < 1 or payment_month > 12:
        return jsonify({"error": "Valid payment month (1-12) is required"}), 400

    current_year = datetime.now().year
    if not payment_year or not isinstance(payment_year, int) or payment_year < 2020 or payment_year > current_year + 1:
        return jsonify({"error": f"Valid payment year (2020-{current_year + 1}) is required"}), 400

    # Check for duplicate payment
    existing = Payment.query.filter_by(
        resident_id=user.id,
        payment_month=payment_month,
        payment_year=payment_year
    ).first()

    if existing:
        return jsonify({
            "error": f"Payment for {payment_month}/{payment_year} already submitted",
            "existing_payment": existing.to_dict()
        }), 400

    # Get current price for the zone
    today = date.today()
    price = MonthlyPrice.query.filter(
        MonthlyPrice.zone_id == user.zone_id,
        MonthlyPrice.effective_from <= today,
        db.or_(MonthlyPrice.effective_to.is_(None), MonthlyPrice.effective_to >= today)
    ).first()

    if not price:
        return jsonify({"error": "No active price set for your zone. Please contact admin."}), 400

    # Validate payment method
    payment_method = data.get("payment_method")
    valid_methods = ["mobile_money", "bank_transfer", "cash"]
    if payment_method and payment_method not in valid_methods:
        return jsonify({"error": f"Invalid payment method. Must be one of: {', '.join(valid_methods)}"}), 400

    payment = Payment(
        resident_id=user.id,
        zone_id=user.zone_id,
        amount=price.amount,
        currency=price.currency,
        payment_month=payment_month,
        payment_year=payment_year,
        payment_method=payment_method,
        transaction_reference=data.get("transaction_reference"),
        proof_url=data.get("proof_url")
    )

    try:
        db.session.add(payment)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Payment submission error for user {user_id}: {str(e)}")
        return jsonify({"error": "Failed to submit payment. Please try again."}), 500

    return jsonify({
        "message": "Payment submitted successfully. Awaiting approval.",
        "payment": payment.to_dict()
    }), 201


# ==================== PAYMENT LISTING (Role-based) ====================

@payment_bp.route("/", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_payments():
    """Get payments - scoped by role"""
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    query = Payment.query

    # Scope by role
    if role == "resident":
        query = query.filter_by(resident_id=user_id)
    elif role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify([]), 200
        query = query.filter_by(zone_id=zone.id)
    # Admin sees all payments

    # Optional filters
    status_filter = request.args.get("status")
    if status_filter:
        query = query.filter_by(status=status_filter)

    zone_filter = request.args.get("zone_id", type=int)
    if zone_filter and role == "admin":
        query = query.filter_by(zone_id=zone_filter)

    month_filter = request.args.get("month", type=int)
    if month_filter:
        query = query.filter_by(payment_month=month_filter)

    year_filter = request.args.get("year", type=int)
    if year_filter:
        query = query.filter_by(payment_year=year_filter)

    payments = query.order_by(Payment.submitted_at.desc()).all()
    return jsonify([p.to_dict() for p in payments]), 200


@payment_bp.route("/stats", methods=["GET"])
@role_required("zone_operator", "admin")
def get_payment_stats():
    """Get payment statistics"""
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    query = Payment.query

    if role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify({"pending": 0, "approved": 0, "rejected": 0, "total_amount": 0}), 200
        query = query.filter_by(zone_id=zone.id)

    # Optional zone filter for admin
    zone_filter = request.args.get("zone_id", type=int)
    if zone_filter and role == "admin":
        query = query.filter_by(zone_id=zone_filter)

    # Optional month/year filter
    month_filter = request.args.get("month", type=int)
    year_filter = request.args.get("year", type=int)
    if month_filter:
        query = query.filter_by(payment_month=month_filter)
    if year_filter:
        query = query.filter_by(payment_year=year_filter)

    payments = query.all()

    stats = {
        "pending": 0,
        "approved": 0,
        "rejected": 0,
        "total_approved_amount": 0
    }

    for p in payments:
        if p.status == "pending":
            stats["pending"] += 1
        elif p.status == "approved":
            stats["approved"] += 1
            stats["total_approved_amount"] += p.amount
        elif p.status == "rejected":
            stats["rejected"] += 1

    return jsonify(stats), 200


@payment_bp.route("/<int:payment_id>", methods=["GET"])
@role_required("resident", "zone_operator", "admin")
def get_payment(payment_id):
    """Get a single payment"""
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    payment = Payment.query.get_or_404(payment_id)

    # Access control
    if role == "resident" and payment.resident_id != int(user_id):
        return jsonify({"error": "You can only view your own payments"}), 403
    elif role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone or payment.zone_id != zone.id:
            return jsonify({"error": "This payment is not in your zone"}), 403

    return jsonify(payment.to_dict()), 200


# ==================== PAYMENT UPDATE (Resident - Pending Only) ====================

@payment_bp.route("/<int:payment_id>", methods=["PUT"])
@role_required("resident")
def update_payment(payment_id):
    """Update a pending payment (resident only)"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_id = get_jwt_identity()
    payment = Payment.query.get_or_404(payment_id)

    # Access control - only the resident who submitted the payment can update it
    if payment.resident_id != int(user_id):
        return jsonify({"error": "You can only update your own payments"}), 403

    # Only pending payments can be updated
    if payment.status != "pending":
        return jsonify({"error": f"Only pending payments can be updated. Current status: {payment.status}"}), 400

    # Update allowed fields
    if "payment_method" in data:
        payment_method = data.get("payment_method")
        valid_methods = ["mobile_money", "bank_transfer", "cash"]
        if payment_method not in valid_methods:
            return jsonify({"error": f"Invalid payment method. Must be one of: {', '.join(valid_methods)}"}), 400
        payment.payment_method = payment_method

    if "transaction_reference" in data:
        payment.transaction_reference = data.get("transaction_reference")

    if "proof_url" in data:
        proof_url = data.get("proof_url")
        if proof_url:  # Only update if provided
            payment.proof_url = proof_url

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update payment"}), 500

    return jsonify({
        "message": "Payment updated successfully",
        "payment": payment.to_dict()
    }), 200


# ==================== PAYMENT APPROVAL/REJECTION (Admin & Zone Operator) ====================

@payment_bp.route("/<int:payment_id>/approve", methods=["PUT"])
@role_required("admin", "zone_operator")
def approve_payment(payment_id):
    """Approve a payment"""
    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    payment = Payment.query.get_or_404(payment_id)

    # Zone operator can only approve payments in their zone
    if role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone or payment.zone_id != zone.id:
            return jsonify({"error": "This payment is not in your zone"}), 403

    if payment.status != "pending":
        return jsonify({"error": f"Only pending payments can be approved. Current status: {payment.status}"}), 400

    payment.status = "approved"
    payment.reviewed_by = int(user_id)
    payment.reviewed_at = datetime.now(timezone.utc)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to approve payment"}), 500

    return jsonify({
        "message": "Payment approved successfully",
        "payment": payment.to_dict()
    }), 200


@payment_bp.route("/<int:payment_id>/reject", methods=["PUT"])
@role_required("admin", "zone_operator")
def reject_payment(payment_id):
    """Reject a payment with reason"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_id = get_jwt_identity()
    role = get_jwt().get("role")

    payment = Payment.query.get_or_404(payment_id)

    # Zone operator can only reject payments in their zone
    if role == "zone_operator":
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone or payment.zone_id != zone.id:
            return jsonify({"error": "This payment is not in your zone"}), 403

    if payment.status != "pending":
        return jsonify({"error": f"Only pending payments can be rejected. Current status: {payment.status}"}), 400

    rejection_reason = (data.get("rejection_reason") or "").strip()
    if not rejection_reason:
        return jsonify({"error": "Rejection reason is required"}), 400

    payment.status = "rejected"
    payment.rejection_reason = rejection_reason
    payment.reviewed_by = int(user_id)
    payment.reviewed_at = datetime.now(timezone.utc)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to reject payment"}), 500

    return jsonify({
        "message": "Payment rejected",
        "payment": payment.to_dict()
    }), 200



# ==================== PAYMENT HISTORY (Resident) ====================

@payment_bp.route("/history", methods=["GET"])
@role_required("resident")
def get_payment_history():
    """Get resident's payment history with summary"""
    user_id = get_jwt_identity()

    payments = Payment.query.filter_by(resident_id=user_id).order_by(
        Payment.payment_year.desc(),
        Payment.payment_month.desc()
    ).all()

    total_paid = sum(p.amount for p in payments if p.status == "approved")
    pending_count = sum(1 for p in payments if p.status == "pending")

    return jsonify({
        "payments": [p.to_dict() for p in payments],
        "summary": {
            "total_payments": len(payments),
            "total_paid": total_paid,
            "pending_count": pending_count,
            "approved_count": sum(1 for p in payments if p.status == "approved"),
            "rejected_count": sum(1 for p in payments if p.status == "rejected")
        }
    }), 200
