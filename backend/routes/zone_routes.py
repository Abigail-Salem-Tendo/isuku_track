from flask import Blueprint, request, jsonify
from extensions import db
from models.zone import Zone

zone_bp = Blueprint('zones', __name__)

# --- CREATE: Add a new zone ---
@zone_bp.route('/', methods=['POST'], strict_slashes=False)
def create_zone():
    data = request.get_json()
    
    # Validation based on our mandatory schema fields
    required_fields = ['name', 'district', 'sector', 'cell', 'village', 'latitude', 'longitude']
    
    # Checking if all required fields are present
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    if Zone.query.filter_by(name=data['name']).first():
        return jsonify({"error": "A zone with this name already exists"}), 409

    new_zone = Zone(
        name=data['name'],
        district=data['district'],
        sector=data['sector'],
        cell=data['cell'],
        village=data['village'],
        latitude=data['latitude'],
        longitude=data['longitude'],
        # These are optional initially according to our design doc
        zo_registered_name=data.get('zo_registered_name'),
        zo_registered_phone=data.get('zo_registered_phone')
    )

    db.session.add(new_zone)
    db.session.commit()

    return jsonify({"message": "Zone created successfully", "id": new_zone.id}), 201