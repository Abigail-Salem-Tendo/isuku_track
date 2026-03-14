from flask import Blueprint, request, jsonify
from extensions import db
from models.schedule import Schedule
from datetime import datetime

schedule_bp = Blueprint('schedules', __name__)


# --- CREATE: Add a new schedule ---
@schedule_bp.route('/', methods=['POST'], strict_slashes=False)
def create_schedule():
    data = request.get_json()

    required_fields = ['date_time_start', 'date_time_end', 'zone_operator_id', 'zone_id']
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    try:
        start = datetime.fromisoformat(data['date_time_start'])
        end = datetime.fromisoformat(data['date_time_end'])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid datetime format. Use ISO 8601 (e.g. 2026-03-07T08:00:00)"}), 400

    if end <= start:
        return jsonify({"error": "date_time_end must be after date_time_start"}), 400

    new_schedule = Schedule(
        date_time_start=start,
        date_time_end=end,
        zone_operator_id=data['zone_operator_id'],
        zone_id=data['zone_id'],
        vehicle_id=data.get('vehicle_id'),
        priority_score=data.get('priority_score', 0.0),
        status=data.get('status', 'not_started')
    )

    db.session.add(new_schedule)
    db.session.commit()

    return jsonify({"message": "Schedule created successfully", "id": new_schedule.id}), 201


# --- READ: Get all schedules ---
@schedule_bp.route('/', methods=['GET'], strict_slashes=False)
def get_schedules():
    status_filter = request.args.get('status')
    zone_filter = request.args.get('zone_id', type=int)

    query = Schedule.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    if zone_filter:
        query = query.filter_by(zone_id=zone_filter)

    schedules = query.order_by(Schedule.date_time_start.asc()).all()
    return jsonify([s.to_dict() for s in schedules]), 200


# --- READ: Get a single schedule ---
@schedule_bp.route('/<int:id>', methods=['GET'], strict_slashes=False)
def get_schedule(id):
    schedule = Schedule.query.get_or_404(id)
    return jsonify(schedule.to_dict()), 200

# --- UPDATE: Modify a schedule ---
@schedule_bp.route('/<int:id>', methods=['PUT'], strict_slashes=False)
def update_schedule(id):
    schedule = Schedule.query.get_or_404(id)
    data = request.get_json()

    if 'date_time_start' in data:
        try:
            schedule.date_time_start = datetime.fromisoformat(data['date_time_start'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid date_time_start format"}), 400

    if 'date_time_end' in data:
        try:
            schedule.date_time_end = datetime.fromisoformat(data['date_time_end'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid date_time_end format"}), 400

    if 'status' in data:
        schedule.status = data['status']
    if 'zone_operator_id' in data:
        schedule.zone_operator_id = data['zone_operator_id']
    if 'zone_id' in data:
        schedule.zone_id = data['zone_id']
    if 'vehicle_id' in data:
        schedule.vehicle_id = data['vehicle_id']
    if 'priority_score' in data:
        schedule.priority_score = data['priority_score']

    db.session.commit()
    return jsonify({"message": "Schedule updated successfully"}), 200

# --- DELETE: Remove a schedule ---
@schedule_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
def delete_schedule(id):
    schedule = Schedule.query.get_or_404(id)
    db.session.delete(schedule)
    db.session.commit()
    return jsonify({"message": "Schedule deleted successfully"}), 200




