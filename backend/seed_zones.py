from app import create_app
from extensions import db
from models.zone import Zone

app = create_app()

with app.app_context():
    print(" Cleaning up zone table...")
    try:
        # This deletes all records in the 'zones' table
        num_rows_deleted = db.session.query(Zone).delete()
        db.session.commit()
        print(f"Removed {num_rows_deleted} old records.")
    except Exception as e:
        db.session.rollback()
        print(f"Error during deletion: {e}")

    # --- Now add the new, correct data ---
    zones_data = [
        {
            "name": "Kimironko Zone A", 
            "district": "Gasabo", "sector": "Kimironko", "cell": "Nyagatovu", "village": "Ubumwe",
            "latitude": -1.9378, "longitude": 30.0925,
            "zo_registered_name": "Musa Habimana", "zo_registered_phone": "+250780000001"
        },
        {
            "name": "Kimironko Zone B", 
            "district": "Gasabo", "sector": "Kimironko", "cell": "Kibagabaga", "village": "Karuruma",
            "latitude": -1.9385, "longitude": 30.0950,
            "zo_registered_name": "Alice Umutoni", "zo_registered_phone": "+250780000002"
        },
        {
            "name": "Gikondo Zone A", 
            "district": "Kicukiro", "sector": "Gikondo", "cell": "Kanserege", "village": "Marembo",
            "latitude": -1.9501, "longitude": 30.0552,
            "zo_registered_name": "Eric Mugisha", "zo_registered_phone": "+250780000003"
        }
        # Add the rest of your zones here...
    ]

    print(" Seeding new zones...")
    for z in zones_data:
        new_zone = Zone(**z)
        db.session.add(new_zone)

    try:
        db.session.commit()
        print(" Database refreshed and seeded successfully!")
    except Exception as e:
        db.session.rollback()
        print(f"Error during seeding: {e}")