from extensions import db

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
    zone_operator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

     # Pre-registered ZO info (for verification during signup)
    zo_registered_name = db.Column(db.String(100), nullable=True)
    zo_registered_phone = db.Column(db.String(20), nullable=True)

     # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    # indexing for fast location searching
    __table_args__ = (
        db.Index('idx_zone_location', 'latitude', 'longitude'),
    )

    def __repr__(self):
        return f"<Zone {self.name}>"