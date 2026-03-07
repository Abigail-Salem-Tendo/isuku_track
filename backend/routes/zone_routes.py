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


    # --- READ: Get all zones ---
@zone_bp.route('/', methods=['GET'], strict_slashes=False)
def get_zones():
    # allowing frontend to filter by district or sector
    district_filter = request.args.get('district')
    sector_filter = request.args.get('sector')
    
    query = Zone.query
    if district_filter:
        query = query.filter_by(district=district_filter)
    if sector_filter:
        query = query.filter_by(sector=sector_filter)
        
    zones = query.all()

    return jsonify([{
        "id": z.id,
        "name": z.name,
        "district": z.district,
        "sector": z.sector,
        "cell": z.cell,
        "village": z.village,
        "latitude": z.latitude,
        "longitude": z.longitude,
        "zo_registered_name": z.zo_registered_name,
        "zo_registered_phone": z.zo_registered_phone,
        "zone_operator_id": z.zone_operator_id
    } for z in zones]), 200


    # --- READ: Getting a single zone ---
@zone_bp.route('/<int:id>', methods=['GET'], strict_slashes=False)
def get_zone(id):
    z = Zone.query.get_or_404(id)
    return jsonify({
        "id": z.id,
        "name": z.name,
        "district": z.district,
        "sector": z.sector,
        "cell": z.cell,
        "village": z.village,
        "latitude": z.latitude,
        "longitude": z.longitude,
        "zo_registered_name": z.zo_registered_name,
        "zo_registered_phone": z.zo_registered_phone,
        "zone_operator_id": z.zone_operator_id
    }), 200