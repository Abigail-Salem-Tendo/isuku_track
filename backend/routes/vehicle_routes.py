
from flask import Blueprint, request, jsonify
from extensions import db
from models.vehicle import Vehicle

# Initialize the blueprint
vehicle_bp = Blueprint('vehicles', __name__)

# --- CREATE: Add a new vehicle ---
@vehicle_bp.route('/', methods=['POST'])
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