from datetime import datetime
from flask import Blueprint, request, make_response
from sqlalchemy.exc import IntegrityError
from extensions import db
from models.user import User
from models.zone import Zone
from models.payment import Payment, MonthlyPrice
from models.claims import Claim
from models.schedule import Schedule

ussd_bp = Blueprint("ussd", __name__, url_prefix="/api/ussd")


CATEGORY_MAP = {
    "1": "missed_collection",
    "2": "overflow",
    "3": "illegal_dumping",
    "4": "damaged_infrastructure",
    "5": "environmental_hazard",
    "6": "other",
}


def normalize_phone(raw: str) -> str:
    phone = (raw or "").strip().replace(" ", "")
    if phone.startswith("+250"):
        return "0" + phone[4:]
    if phone.startswith("250"):
        return "0" + phone[3:]
    return phone


def respond(message: str, end: bool = False):
    prefix = "END" if end else "CON"
    resp = make_response(f"{prefix} {message}")
    resp.headers["Content-Type"] = "text/plain"
    return resp


def find_user_by_phone(msisdn: str):
    normalized = normalize_phone(msisdn)
    alt = msisdn.strip() if msisdn else None
    candidates = [p for p in {normalized, alt} if p]
    if not candidates:
        return None
    return User.query.filter(User.phone_number.in_(candidates), User.role == "resident").first()


def current_price_for_zone(zone_id: int):
    today = datetime.utcnow().date()
    return (
        MonthlyPrice.query.filter(
            MonthlyPrice.zone_id == zone_id,
            MonthlyPrice.effective_from <= today,
            (MonthlyPrice.effective_to == None) | (MonthlyPrice.effective_to >= today),
        )
        .order_by(MonthlyPrice.effective_from.desc())
        .first()
    )


def menu_text():
    return (
        "Welcome to IsukuTrack USSD\n"
        "1. Pay monthly fee\n"
        "2. Submit claim\n"
        "3. Check claim status\n"
        "4. View schedule\n"
        "5. Profile & zone info\n"
        "6. Loyalty points\n"
        "0. Exit"
    )


@ussd_bp.route("/", methods=["POST", "GET"])
def ussd_entry():
    msisdn = request.values.get("phoneNumber") or request.values.get("phone")
    text = (request.values.get("text") or "").strip()

    user = find_user_by_phone(msisdn)
    if not user:
        return respond("Phone not registered as resident.", end=True)

    tokens = [t for t in text.split("*") if t] if text else []

    if not tokens:
        return respond(menu_text())

    choice = tokens[0]

    # 0 Exit
    if choice == "0":
        return respond("Goodbye.", end=True)

    # 1 Pay monthly fee
    if choice == "1":
        if len(tokens) == 1:
            return respond("Enter month (1-12):")
        if len(tokens) == 2:
            return respond("Enter year (YYYY):")

        try:
            month = int(tokens[1])
            year = int(tokens[2])
            if month < 1 or month > 12:
                return respond("Invalid month. Enter 1-12:")
            if year < 2000 or year > 2100:
                return respond("Invalid year. Enter YYYY:")
        except ValueError:
            return respond("Invalid numbers. Restart with 1.", end=True)

        price = current_price_for_zone(user.zone_id)
        amount = price.amount if price else 0

        if len(tokens) == 3:
            return respond(
                f"Zone fee for {month}/{year} is {amount} {price.currency if price else 'RWF'}.\n1. Confirm\n0. Cancel"
            )

        confirm = tokens[3]
        if confirm != "1":
            return respond("Cancelled.", end=True)

        payment = Payment(
            resident_id=user.id,
            zone_id=user.zone_id,
            amount=amount,
            currency=price.currency if price else "RWF",
            payment_month=month,
            payment_year=year,
            payment_method="mobile_money",
            status="pending",
        )
        db.session.add(payment)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return respond("Payment already submitted for that month.", end=True)
        return respond("Payment submitted. Pending review.", end=True)

    # 2 Submit claim
    if choice == "2":
        if len(tokens) == 1:
            return respond(
                "Choose category:\n"
                "1. Missed collection\n"
                "2. Overflow\n"
                "3. Illegal dumping\n"
                "4. Damaged infrastructure\n"
                "5. Environmental hazard\n"
                "6. Other"
            )
        if len(tokens) == 2:
            return respond("Enter short description (160 chars):")

        category_key = tokens[1]
        description = " ".join(tokens[2:])[:160]
        category = CATEGORY_MAP.get(category_key)
        if not category:
            return respond("Invalid category. Restart.", end=True)

        claim = Claim(
            user_id=user.id,
            zone_id=user.zone_id,
            type="claim",
            description=description,
            claim_category=category,
            status="open",
        )
        db.session.add(claim)
        db.session.commit()
        return respond("Claim submitted. We will review it.", end=True)

    # 3 Check claim status
    if choice == "3":
        claims = (
            Claim.query.filter_by(user_id=user.id)
            .order_by(Claim.reported_at.desc())
            .limit(3)
            .all()
        )
        if not claims:
            return respond("No claims found.", end=True)
        lines = []
        for c in claims:
            when = c.reported_at.strftime("%b %d") if c.reported_at else "--"
            lines.append(f"{when} {c.claim_category or ''}: {c.status}")
        return respond("\n".join(lines), end=True)

    # 4 View schedule
    if choice == "4":
        now = datetime.utcnow()
        sched = (
            Schedule.query.filter(
                Schedule.zone_id == user.zone_id,
                Schedule.date_time_start >= now,
            )
            .order_by(Schedule.date_time_start.asc())
            .first()
        )
        if not sched:
            return respond("No upcoming schedule.", end=True)
        start = sched.date_time_start.strftime("%b %d %H:%M") if sched.date_time_start else "--"
        end = sched.date_time_end.strftime("%H:%M") if sched.date_time_end else "--"
        return respond(f"Next pickup {start}-{end}.", end=True)

    # 5 Profile & zone info
    if choice == "5":
        zone = Zone.query.get(user.zone_id)
        zo = zone.zone_operator if zone else None
        zone_name = zone.name if zone else "Unknown"
        zo_contact = zo.phone_number if zo else "N/A"
        return respond(f"{user.username}\nZone: {zone_name}\nZO: {zo_contact}", end=True)

    # 6 Loyalty points
    if choice == "6":
        return respond(f"Points: {user.loyalty_points or 0}", end=True)

    return respond("Invalid option.", end=True)
