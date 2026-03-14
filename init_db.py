from app import app
from extensions import db
from models.user import User
from models.zone import Zone
from models.vehicle import Vehicle
from models.schedule import Schedule

with app.app_context():
    db.create_all()
    print("Tables created successfully!")
    
    # Verify tables
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables in database: {tables}")
