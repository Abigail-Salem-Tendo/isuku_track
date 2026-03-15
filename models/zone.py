from extensions import db
from datetime import datetime

class Zone(db.Model):
    __tablename__ = "zones"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False, unique=True)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    
    # Geographic info
    district = db.Column(db.String(100), nullable=False)
    sector = db.Column(db.String(100), nullable=False)
    cell = db.Column(db.String(100), nullable=False)
    village = db.Column(db.String(100), nullable=False)

    # Assigned Zone Operator
    zone_operator_id = db.Column(db.Integer, db.ForeignKey('users.id', use_alter=True, name='fk_zone_operator'), nullable=True)

    
    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    # Relationships
    users = db.relationship("User", foreign_keys="User.zone_id", back_populates="zone")
    zone_operator = db.relationship("User", foreign_keys=[zone_operator_id], uselist=False)

    # indexing for fast location searching
    __table_args__ = (
        db.Index('idx_zone_location', 'latitude', 'longitude'),
    )

    def __repr__(self):
        return f"<Zone {self.name}>"