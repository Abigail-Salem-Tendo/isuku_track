from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(50), nullable=False)
    role = db.Column(
        db.Enum("resident", "zone_operator", "admin", name="user_role"),
        nullable=False,
        default="resident"
    )
    phone_number = db.Column(db.String(15), nullable=True)
    # zone_id = db.Column(db.Integer, db.ForeignKey("zones.id"), nullable=True)
    loyalty_points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    # zone = db.relationship("Zone", back_populates="users")

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "phone_number": self.phone_number,
            # "zone_id": self.zone_id,
            "loyalty_points": self.loyalty_points,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
