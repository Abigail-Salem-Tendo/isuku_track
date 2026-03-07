from app import create_app
from extensions import db
from models.zone import Zone

app = create_app()
app.app_context().push()

# zone seed data 
zones = [
    {"name": "Kimironko Zone A", "latitude": -1.9378, "longitude": 30.0925},
    {"name": "Kimironko Zone B", "latitude": -1.9385, "longitude": 30.0950},
    {"name": "Gikondo Zone A", "latitude": -1.9501, "longitude": 30.0552},
    {"name": "Gikondo Zone B", "latitude": -1.9520, "longitude": 30.0580},
    {"name": "Kacyiru Zone A", "latitude": -1.9400, "longitude": 30.0650},
    {"name": "Kacyiru Zone B", "latitude": -1.9425, "longitude": 30.0680},
    {"name": "Nyamirambo Zone A", "latitude": -1.9700, "longitude": 30.0520},
    {"name": "Nyamirambo Zone B", "latitude": -1.9725, "longitude": 30.0550},
]

for z in zones:
    zone = Zone(
        name=z["name"],
        latitude=z["latitude"],
        longitude=z["longitude"]
    )
    db.session.add(zone)

db.session.commit()
print(f"Seeded {len(zones)} zones successfully!")