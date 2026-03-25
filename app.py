from flask import Flask
from flask_cors import CORS
from extensions import db, migrate, bcrypt, jwt, mail
from models.user import User
from models.zone import Zone
from models.vehicle import Vehicle
from models.claims import Claim
from models.payment import Payment, MonthlyPrice
from models.notification import Notification
from routes.auth import auth_bp
from routes.vehicle_routes import vehicle_bp
from routes.zone_routes import zone_bp
from config import Config
from routes.schedules import schedule_bp
from routes.claims import claims_bp
from routes.upload import upload_bp
from routes.reports import reports_bp
from routes.payment_routes import payment_bp
from flask import render_template


def create_app():
    app = Flask(__name__)

    CORS(app, resources={r"/api/*": {"origins": "*"}}) # allowing frontend requests from any origin
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(vehicle_bp, url_prefix='/api/vehicles')
    app.register_blueprint(zone_bp, url_prefix='/api/zones')
    app.register_blueprint(schedule_bp, url_prefix='/api/schedules')
    app.register_blueprint(claims_bp, url_prefix='/api/claims')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')


    @app.route("/")
    @app.route("/login")
    def login_page():
        return render_template("login1.html")

    # Resident pages
    @app.route("/resident/dashboard")
    @app.route("/static/pages/resident/resident_dash.html")
    def resident_dashboard():
        return render_template("resident/resident_dash.html")

    @app.route("/static/pages/resident/resident_schedule.html")
    def resident_schedule():
        return render_template("resident/resident_schedule.html")

    @app.route("/static/pages/resident/resident_claims.html")
    def resident_claims():
        return render_template("resident/resident_claims.html")

    @app.route("/static/pages/resident/resident_payments.html")
    def resident_payments():
        return render_template("resident/resident_dash.html")

    @app.route("/static/pages/resident/profile.html")
    def resident_profile():
        return render_template("resident/resident_dash.html") 

    # Admin pages
    @app.route("/admin/dashboard")
    def admin_dashboard():
        return render_template("admin/admin_dash.html")

    # Zone operator pages
    @app.route("/zone-operator/dashboard")
    def zo_dashboard():
        return render_template("zone_operator/zo_dash.html")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)




