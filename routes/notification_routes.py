from flask import Blueprint, request, jsonify
from extensions import db
from models.notification import Notification
#Implementing Auth
from utils.auth_helpers import role_required
from flask_jwt_extended import get_jwt_identity


notification_bp = Blueprint('notifications', __name__)


# Auth logic :Create: admin or system only.        View/Mark Read/Delete: A user should only be able to interact with their own notifications. We use get_jwt_identity() to enforce this.

 # OPTIMIZATION:Implementing pagination to prevent memory crashes

# --- CREATE: Generate a new notification ---
@notification_bp.route('/', methods=['POST'], strict_slashes=False)
@role_required('admin')
def create_notification():
    data = request.get_json()
    
    required_fields = ['user_id', 'title', 'message', 'type']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    new_notification = Notification(
        user_id=data['user_id'],
        title=data['title'],
        message=data['message'],
        type=data['type']
    )

    db.session.add(new_notification)
    db.session.commit()

    return jsonify({"message": "Notification created successfully", "id": new_notification.id}), 201

# --- READ: Get paginated notifications for a specific user ---
@notification_bp.route('/user/<int:user_id>', methods=['GET'], strict_slashes=False)
@role_required('admin', 'zone_operator', 'resident')
def get_user_notifications(user_id):

    # SECURITY CHECK: Ensuring the requester is asking for their own data
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        return jsonify({"error": "Unauthorized to view these notifications"}), 403
   
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Fetch them ordered by newest first
    paginated_data = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        "notifications": [n.to_dict() for n in paginated_data.items],
        "total": paginated_data.total,
        "pages": paginated_data.pages,
        "current_page": paginated_data.page
    }), 200

# --- UPDATE: Mark a notification as read ---
@notification_bp.route('/<int:id>/read', methods=['PUT'], strict_slashes=False)
@role_required('admin', 'zone_operator', 'resident')
def mark_as_read(id):
    notification = Notification.query.get_or_404(id)

    # SECURITY CHECK
    current_user_id = int(get_jwt_identity())
    if notification.user_id != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    notification.is_read = True
    db.session.commit()
    
    return jsonify({"message": "Notification marked as read", "notification": notification.to_dict()}), 200

# --- DELETE: Remove a notification ---
@notification_bp.route('/<int:id>', methods=['DELETE'], strict_slashes=False)
@role_required('admin', 'zone_operator', 'resident')
def delete_notification(id):
    notification = Notification.query.get_or_404(id)

    # SECURITY CHECK
    current_user_id = int(get_jwt_identity())
    if notification.user_id != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    db.session.delete(notification)
    db.session.commit()
    
    return jsonify({"message": "Notification deleted successfully"}), 200