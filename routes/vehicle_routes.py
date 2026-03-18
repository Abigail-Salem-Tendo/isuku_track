
from flask import Blueprint, request, jsonify
from extensions import db
from models.vehicle import Vehicle
#implementing auth
from utils.auth_helpers import role_required

# Initialize the blueprint
vehicle_bp = Blueprint('vehicles', __name__)

#Auth Logic : Admins get full control (Create, Read, Update, Delete).Zone Operators get operational control (Read, Update status to 'maintenance', etc.), but cannot delete trucks from the system.



# --- CREATE: Add a new vehicle ---
@vehicle_bp.route('/', methods=['POST'])
@role_required('admin')
def create_vehicle():
    data = request.get_json()
    
    # validation
    required_fields = ['plate_number', 'driver_name', 'driver_phone']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Checking for duplicates
    if Vehicle.query.filter_by(plate_number=data['plate_number']).first():
        return jsonify({"error": "Vehicle with this plate number already exists"}), 409

    new_vehicle = Vehicle(
        plate_number=data['plate_number'],
        driver_name=data['driver_name'],
        driver_phone=data['driver_phone'],
        status=data.get('status', 'available') # Defaults to available if not provided
    )

    db.session.add(new_vehicle)
    db.session.commit()

    return jsonify({"message": "Vehicle created successfully", "id": new_vehicle.id}), 201


    # --- READ: Get all vehicles ---
@vehicle_bp.route('/', methods=['GET'])
@role_required('admin', 'zone_operator')
def get_vehicles():
    #  allow filtering by status via query param (e.g., ?status=available)
    status_filter = request.args.get('status')
    
    if status_filter:
        vehicles = Vehicle.query.filter_by(status=status_filter).all()
    else:
        vehicles = Vehicle.query.all()

    return jsonify([{
        "id": v.id,
        "plate_number": v.plate_number,
        "driver_name": v.driver_name,
        "driver_phone": v.driver_phone,
        "status": v.status
    } for v in vehicles]), 200

# --- READ: Get a single vehicle by ID ---
@vehicle_bp.route('/<int:id>', methods=['GET'])
@role_required('admin', 'zone_operator')
def get_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    return jsonify({
        "id": vehicle.id,
        "plate_number": vehicle.plate_number,
        "driver_name": vehicle.driver_name,
        "driver_phone": vehicle.driver_phone,
        "status": vehicle.status
    }), 200


# --- UPDATE: Modify a vehicle ---
@vehicle_bp.route('/<int:id>', methods=['PUT'])
@role_required('admin', 'zone_operator')
def update_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    data = request.get_json()

    # Updating fields if they exist in the payload
    if 'driver_name' in data:
        vehicle.driver_name = data['driver_name']
    if 'driver_phone' in data:
        vehicle.driver_phone = data['driver_phone']
    if 'status' in data:
        vehicle.status = data['status']

    db.session.commit()
    return jsonify({"message": "Vehicle updated successfully"}), 200

    # --- DELETE: Remove a vehicle ---
@vehicle_bp.route('/<int:id>', methods=['DELETE'])
@role_required('admin')
def delete_vehicle(id):
    vehicle = Vehicle.query.get_or_404(id)
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"message": "Vehicle deleted successfully"}), 200