from flask import Flask
from flask_cors import CORS
from extensions import db, migrate, bcrypt, jwt
from models.user import User
from models.zone import Zone
from models.vehicle import Vehicle
from routes.auth import auth_bp
from routes.vehicle_routes import vehicle_bp
from routes.zone_routes import zone_bp
from config import Config
from routes.schedules import schedule_bp
from flask import render_template

def create_app():
    app = Flask(__name__)
    CORS(app) # allowing frontend requests
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(vehicle_bp, url_prefix='/api/vehicles')
    app.register_blueprint(zone_bp, url_prefix='/api/zones')
    app.register_blueprint(schedule_bp, url_prefix='/api/schedules')

    @app.route("/")
    @app.route("/login")
    def login_page():
        return render_template("login1.html")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)




