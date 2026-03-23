from extensions import db


class Claim(db.Model):
    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)

    # Who submitted it
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Which zone it belongs to
    zone_id = db.Column(db.Integer, db.ForeignKey("zones.id"), nullable=False)

    # "claim" (resident) or "suggestion" (zone operator)
    type = db.Column(
        db.Enum("claim", "suggestion", name="claim_type"),
        nullable=False
    )

    description = db.Column(db.Text, nullable=False)

    # Appwrite image URL — required for claims, null for suggestions
    photo_url = db.Column(db.String(500), nullable=True)

    # Resident claim categories
    claim_category = db.Column(
        db.Enum(
            "missed_collection", "overflow", "illegal_dumping",
            "damaged_infrastructure", "environmental_hazard", "other",
            name="claim_category_enum"
        ),
        nullable=True
    )

    # Zone operator suggestion categories
    suggestion_category = db.Column(
        db.Enum(
            "route_optimization", "vehicle_issues", "resident_disputes",
            "staffing_concerns", "infrastructure_needs",
            name="suggestion_category_enum"
        ),
        nullable=True
    )

    # Status flow: open → under_review → approved / rejected
    status = db.Column(
        db.Enum("open", "under_review", "approved", "rejected", name="claim_status"),
        nullable=False,
        default="open",
        server_default="open"
    )

    reported_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # ZO who reviewed the claim
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Loyalty points awarded to resident on approval
    points_awarded = db.Column(db.Integer, default=0)

    # Rejection details — only filled when status = rejected
    rejection_category = db.Column(
        db.Enum(
            "insufficient_evidence", "duplicate_claim", "not_in_zone",
            "false_claim", "resolved_already", "other",
            name="rejection_category_enum"
        ),
        nullable=True
    )
    rejection_detail = db.Column(db.Text, nullable=True)

    # Relationships
    user = db.relationship("User", foreign_keys=[user_id], backref="claims")
    zone = db.relationship("Zone", backref="claims")
    resolver = db.relationship("User", foreign_keys=[resolved_by])

    # Indexes and constraints
    __table_args__ = (
        db.Index("idx_claims_zone", "zone_id"),
        db.Index("idx_claims_status", "status"),
        db.Index("idx_claims_user", "user_id"),
        db.Index("idx_claims_category", "claim_category"),

        # One category per row: either claim_category OR suggestion_category, never both, never neither
        db.CheckConstraint(
            "(claim_category IS NOT NULL AND suggestion_category IS NULL) "
            "OR (claim_category IS NULL AND suggestion_category IS NOT NULL)",
            name="chk_one_category_only"
        ),

        # Type must match the category column that's filled
        db.CheckConstraint(
            "(type = 'claim' AND claim_category IS NOT NULL AND suggestion_category IS NULL) "
            "OR (type = 'suggestion' AND suggestion_category IS NOT NULL AND claim_category IS NULL)",
            name="chk_type_matches_category"
        ),

        # Rejection requires both rejection_category and rejection_detail
        db.CheckConstraint(
            "(status != 'rejected') "
            "OR (status = 'rejected' AND rejection_category IS NOT NULL AND rejection_detail IS NOT NULL)",
            name="chk_rejection_requires_details"
        ),

        # Valid status values
        db.CheckConstraint(
            "status IN ('open', 'under_review', 'approved', 'rejected')",
            name="chk_valid_claim_status"
        ),
    )

    def __repr__(self):
        return f"<Claim {self.id} - {self.type} - {self.status}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "zone_id": self.zone_id,
            "type": self.type,
            "description": self.description,
            "photo_url": self.photo_url,
            "claim_category": self.claim_category,
            "suggestion_category": self.suggestion_category,
            "status": self.status,
            "reported_at": self.reported_at.isoformat() if self.reported_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": self.resolved_by,
            "points_awarded": self.points_awarded,
            "rejection_category": self.rejection_category,
            "rejection_detail": self.rejection_detail,
        }
