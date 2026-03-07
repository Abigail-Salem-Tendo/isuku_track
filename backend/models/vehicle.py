from extensions import db

class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    
    # explicitly setting index=True
    plate_number = db.Column(db.String(20), nullable=False, unique=True, index=True)
    
    driver_name = db.Column(db.String(100), nullable=False)
    
    # index driver_phone because admins might search for a driver's vehicle

    driver_phone = db.Column(db.String(20), nullable=False, index=True)
    

    status = db.Column(
        db.String(20), 
        nullable=False, 
        default='available',
        server_default='available'
    )
    
    created_at = db.Column(
        db.DateTime, 
        server_default=db.func.now()
    )


    __table_args__ = (
        # 1. Indexing Status: If the admin frequently filters the fleet by 
        # "available" or "in_use", this index speeds up those queries significantly.
        db.Index('idx_vehicle_status', 'status'),
        
        # 2. Check Constraint: Ensures only valid statuses are entered at the DB level,
        # protecting data integrity even if the application logic fails.
        db.CheckConstraint(
            "status IN ('available', 'in_use', 'maintenance')", 
            name='chk_vehicle_valid_status'
        ),
    )

    def __repr__(self):
        return f"<Vehicle {self.plate_number} - {self.status}>"