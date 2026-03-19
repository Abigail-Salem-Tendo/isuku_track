from extensions import db


class Claim(db.Model):
    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Auto-set from submitter's zone (resident: user.zone_id, ZO: looked up from zones table)
    zone_id = db.Column(db.Integer, db.ForeignKey("zones.id"), nullable=False)

    description = db.Column(db.Text, nullable=False)

    # Required for resident claims, NULL for ZO suggestions
    photo_url = db.Column(db.String(500), nullable=True)

    # "claim" for residents, "suggestion" for zone operators
    type = db.Column(
        db.Enum("claim", "suggestion", name="claim_type"),
        nullable=False
    )

    # Resident-only categories
    claim_category = db.Column(
        db.Enum(
            "missed_collection", "overflow", "illegal_dumping",
            "damaged_infrastructure", "environmental_hazard", "other",
            name="claim_categories"
        ),
        nullable=True
    )

    # ZO-only categories
    suggestion_category = db.Column(
        db.Enum(
            "route_optimization", "vehicle_issues", "resident_disputes",
            "staffing_concerns", "infrastructure_needs",
            name="suggestion_categories"
        ),
        nullable=True
    )

    # open → under_review → approved / rejected
    status = db.Column(
        db.Enum("open", "under_review", "approved", "rejected", name="claim_status"),
        nullable=False,
        default="open",
        server_default="open"
    )

    reported_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    # Loyalty points given to resident on approval
    points_awarded = db.Column(db.Integer, default=0)

    # Only filled when status = rejected
    rejection_category = db.Column(
        db.Enum(
            "insufficient_evidence", "duplicate_claim", "not_in_zone",
            "false_claim", "resolved_already", "other",
            name="rejection_categories"
        ),
        nullable=True
    )
    rejection_detail = db.Column(db.Text, nullable=True)

    # Relationships
    user = db.relationship("User", foreign_keys=[user_id], backref="claims")
    zone = db.relationship("Zone", backref="claims")
    resolver = db.relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        # Indexes for common query patterns
        db.Index("idx_claims_zone", "zone_id"),
        db.Index("idx_claims_status", "status"),
        db.Index("idx_claims_user", "user_id"),
        db.Index("idx_claims_category", "claim_category"),

        # Mutual exclusivity: exactly one category must be filled
        db.CheckConstraint(
            "(claim_category IS NOT NULL AND suggestion_category IS NULL) "
            "OR (claim_category IS NULL AND suggestion_category IS NOT NULL)",
            name="chk_one_category_only"
        ),

        # Type must match the category that's filled
        db.CheckConstraint(
            "(type = 'claim' AND claim_category IS NOT NULL AND suggestion_category IS NULL) "
            "OR (type = 'suggestion' AND suggestion_category IS NOT NULL AND claim_category IS NULL)",
            name="chk_type_matches_category"
        ),

        # Rejection requires both fields
        db.CheckConstraint(
            "(status != 'rejected') "
            "OR (rejection_category IS NOT NULL AND rejection_detail IS NOT NULL)",
            name="chk_rejection_requires_details"
        ),

        # Valid status transitions enforced at DB level
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
            "description": self.description,
            "photo_url": self.photo_url,
            "type": self.type,
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
