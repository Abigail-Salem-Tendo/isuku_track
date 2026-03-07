from extensions import db
class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(db.Integer, primary_key=True)

    # Time window for the collection trip
    date_time_start = db.Column(db.DateTime, nullable=False)
    date_time_end = db.Column(db.DateTime, nullable=False)

    # ZO progresses the status through the collection lifecycle
    status = db.Column(
        db.String(20),
        nullable=False,
        default='not_started',
        server_default='not_started'
    )

    # Foreign keys linking the schedule to its assigned ZO, zone, and vehicle
    zone_operator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    zone_id = db.Column(db.Integer, db.ForeignKey('zones.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=True)  # nullable: vehicle may be assigned later

    # Higher score = more urgency (derived from approved claims in the zone)
    priority_score = db.Column(db.Float, default=0.0)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )
