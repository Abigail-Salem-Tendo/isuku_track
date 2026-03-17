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
        zone_operator_id=data.get('zone_operator_id')
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
        "zone_operator_id": z.zone_operator_id,
        "zone_operator_name": z.zone_operator.username if z.zone_operator else None,
        "zone_operator_phone": z.zone_operator.phone_number if z.zone_operator else None
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
        "zone_operator_id": z.zone_operator_id,
        "zone_operator_name": z.zone_operator.username if z.zone_operator else None,
        "zone_operator_phone": z.zone_operator.phone_number if z.zone_operator else None
    }), 200

# --- UPDATE: Modify a zone ---
@zone_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
def update_zone(id):
    zone = Zone.query.get_or_404(id)
    data = request.get_json()

    # Updating only the fields provided in the request
    updatable_fields = [
        'name', 'district', 'sector', 'cell', 'village',
        'latitude', 'longitude', 'zone_operator_id'
    ]
    
    for field in updatable_fields:
        if field in data:
            setattr(zone, field, data[field])

    db.session.commit()
    return jsonify({"message": "Zone updated successfully"}), 200

    # --- DELETE: Remove a zone ---
@zone_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
def delete_zone(id):
    zone = Zone.query.get_or_404(id)
    db.session.delete(zone)
    db.session.commit()
    return jsonify({"message": "Zone deleted successfully"}), 200