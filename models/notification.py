from datetime import datetime
from extensions import db

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    
    # Enforcing specific event types
    type = db.Column(
        db.Enum(
            "claim_update", "payment_update", "schedule_update", 
            "new_assignment", "report_reminder", 
            name="notification_types"
        ),
        nullable=False
    )
    
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # OPTIMIZATION: Composite index for fast lookups of unread user notifications
    __table_args__ = (
        db.Index('idx_user_unread', 'user_id', 'is_read'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }