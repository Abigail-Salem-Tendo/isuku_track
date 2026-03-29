from flask import Flask
from flask_cors import CORS
from extensions import db, migrate, bcrypt, jwt, mail
from models.user import User
from models.zone import Zone
from models.vehicle import Vehicle
from models.claims import Claim
from models.payment import Payment, MonthlyPrice
from routes.auth import auth_bp
from routes.vehicle_routes import vehicle_bp
from routes.zone_routes import zone_bp
from config import Config
from routes.schedules import schedule_bp
from routes.claims import claims_bp
from routes.upload import upload_bp
from routes.reports import reports_bp
from routes.payment_routes import payment_bp
from routes.notifications import notifications_bp
from routes.residents import residents_bp
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
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(residents_bp, url_prefix='/api/residents')



    @app.route("/")
    @app.route("/login")
    def login_page():
        return render_template("login1.html")
    
    @app.route("/reset-password")
    def reset_password_page():
        return render_template("reset-password.html")

    #Admin pages
    @app.route("/admin/zones")
    def admin_zones():
        return render_template("admin/admin_zones.html")
    
    @app.route("/admin/vehicles")
    def admin_vehicles():
        return render_template("admin/admin_vehicles.html")

    @app.route("/admin/users")
    def admin_users():
        return render_template("admin/admin_users.html")

    @app.route("/admin/operators")
    def admin_operators():
        return render_template("admin/admin_zone_operator.html")

    @app.route("/admin/schedules")
    def admin_schedules():
        return render_template("admin/admin_schedules.html")

    @app.route("/admin/claims")
    def admin_claims():
        return render_template("admin/admin_claims.html")

    @app.route("/admin/payments")
    def admin_payments():
        return render_template("admin/admin_payments.html")

    @app.route("/admin/reports")
    def admin_reports():
        return render_template("admin/admin_reports.html")

    @app.route("/admin/dashboard")
    def admin_dashboard():
        return render_template("admin/admin_dash.html")
    
    @app.route("/map")
    def interactive_map():
        return render_template("interactive-map.html")

    # Resident pages
    @app.route("/resident/dashboard")
    def resident_dashboard():
        return render_template("resident/resident_dash.html")

    @app.route("/resident/resident_schedule")
    def resident_schedule():
        return render_template("resident/resident_schedule.html")

    @app.route("/resident/resident_claims")
    def resident_claims():
        return render_template("resident/resident_claims.html")

    @app.route("/resident/resident_payments")
    def resident_payments():
        return render_template("resident/resident_payments.html")

    @app.route("/resident/resident_profile")
    def resident_profile():
        return render_template("resident/resident_profile.html") 

    # Zone operator pages
    @app.route("/zone-operator/dashboard")
    def zo_dashboard():
        return render_template("zone_operator/zo_dash.html")

    @app.route("/zone-operator/schedules")
    def zo_schedules():
        return render_template("zone_operator/zo_schedules.html")

    @app.route("/zone-operator/claims")
    def zo_claims():
        return render_template("zone_operator/zo_claims.html")

    @app.route("/zone-operator/payments")
    def zo_payments():
        return render_template("zone_operator/zo_payments.html")

    @app.route("/zone-operator/residents")
    def zo_residents():
        return render_template("zone_operator/zo_residents.html")

    @app.route("/zone-operator/profile")
    def zo_profile():
        return render_template("zone_operator/zo_profile.html")

    @app.route("/zone-operator/report")
    def zo_report():
        return render_template("zone_operator/zo_report.html")

    @app.route("/logout")
    def logout():
        """Logout user by redirecting to login page."""
        return render_template("login1.html")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)




