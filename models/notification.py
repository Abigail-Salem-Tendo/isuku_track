from extensions import db


class Notification(db.Model):
    """Model for user notifications"""
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(
        db.Enum("payment_approved", "payment_rejected", "payment_reminder", "general", name="notification_type"),
        nullable=False,
        default="general"
    )
    reference_id = db.Column(db.Integer, nullable=True)  # ID of related entity (e.g., payment_id)
    reference_type = db.Column(db.String(50), nullable=True)  # Type of related entity (e.g., "payment")
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Relationships
    user = db.relationship("User", backref="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "reference_id": self.reference_id,
            "reference_type": self.reference_type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
