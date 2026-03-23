from extensions import db
from datetime import datetime


class MonthlyPrice(db.Model):
    """Model for admin-configured monthly payment prices per zone"""
    __tablename__ = "monthly_prices"

    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey("zones.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="RWF")
    effective_from = db.Column(db.Date, nullable=False)
    effective_to = db.Column(db.Date, nullable=True)
    set_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    # Relationships
    zone = db.relationship("Zone", backref="monthly_prices")
    admin = db.relationship("User", foreign_keys=[set_by])

    def to_dict(self):
        return {
            "id": self.id,
            "zone_id": self.zone_id,
            "zone_name": self.zone.name if self.zone else None,
            "amount": self.amount,
            "currency": self.currency,
            "effective_from": self.effective_from.isoformat() if self.effective_from else None,
            "effective_to": self.effective_to.isoformat() if self.effective_to else None,
            "set_by": self.set_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Payment(db.Model):
    """Model for resident monthly payments"""
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    zone_id = db.Column(db.Integer, db.ForeignKey("zones.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="RWF")
    payment_month = db.Column(db.Integer, nullable=False)  # 1-12
    payment_year = db.Column(db.Integer, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)  # mobile_money, bank_transfer, cash
    transaction_reference = db.Column(db.String(100), nullable=True)
    proof_url = db.Column(db.String(500), nullable=True)  # URL to payment proof/receipt
    status = db.Column(
        db.Enum("pending", "approved", "rejected", name="payment_status"),
        nullable=False,
        default="pending"
    )
    rejection_reason = db.Column(db.Text, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    submitted_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    # Relationships
    resident = db.relationship("User", foreign_keys=[resident_id], backref="payments")
    zone = db.relationship("Zone", backref="payments")
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])

    # Ensure one payment per resident per month
    __table_args__ = (
        db.UniqueConstraint('resident_id', 'payment_month', 'payment_year', name='unique_monthly_payment'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "resident_id": self.resident_id,
            "resident_name": self.resident.username if self.resident else None,
            "resident_email": self.resident.email if self.resident else None,
            "resident_phone": self.resident.phone_number if self.resident else None,
            "zone_id": self.zone_id,
            "zone_name": self.zone.name if self.zone else None,
            "amount": self.amount,
            "currency": self.currency,
            "payment_month": self.payment_month,
            "payment_year": self.payment_year,
            "payment_method": self.payment_method,
            "transaction_reference": self.transaction_reference,
            "proof_url": self.proof_url,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "reviewed_by": self.reviewed_by,
            "reviewer_name": self.reviewer.username if self.reviewer else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
