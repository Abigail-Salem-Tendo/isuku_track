from extensions import db

class Zone(db.Model):
    __tablename__ = "zones"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False, unique=True)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

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