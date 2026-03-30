from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, get_jwt
from extensions import db
from models.user import User
from models.zone import Zone
from utils.auth_helpers import role_required

residents_bp = Blueprint('residents', __name__)

# --- READ: Get residents in a zone operator's assigned zone ---
@residents_bp.route('/', methods=['GET'])
@role_required('zone_operator', 'admin')
def get_residents():
    user_id = get_jwt_identity()
    role = get_jwt().get('role')

    query = User.query.filter_by(role='resident')

    if role == 'zone_operator':
        # Get zone operator's assigned zone
        zone = Zone.query.filter_by(zone_operator_id=user_id).first()
        if not zone:
            return jsonify([]), 200

        # Filter residents by zone
        query = query.filter_by(zone_id=zone.id)
    # Admin sees all residents (no filter)

    residents = query.all()

    return jsonify([{
        'id': r.id,
        'name': r.username,
        'email': r.email,
        'phone_number': r.phone_number,
        'zone_id': r.zone_id,
        'loyalty_points': r.loyalty_points or 0,
        'created_at': r.created_at.isoformat() if r.created_at else None,
        'address': None  # Add address field if available in user model in future
    } for r in residents]), 200
