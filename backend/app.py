from flask import Flask
from extensions import db, migrate, bcrypt, jwt
from models.user import User
<<<<<<< HEAD
from models.zone import Zone
from models.vehicle import Vehicle
from routes.vehicle_routes import vehicle_bp
=======
from routes.auth import auth_bp
>>>>>>> df2cafc (feature: authentication endpoint)
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)

    # Registering blueprints
    app.register_blueprint(vehicle_bp, url_prefix='/api/vehicles')

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)