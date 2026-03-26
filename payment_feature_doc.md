# Payment Module Documentation

## Overview

The Payment module enables residents to pay monthly waste management fees based on prices set by admin. It provides role-based access for viewing, approving, and rejecting payments with notification support.

---

## Database Models

### 1. MonthlyPrice

Stores the monthly payment price configuration per zone, set by admin.

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| zone_id | Integer | Foreign key to zones table |
| amount | Float | Payment amount |
| currency | String | Currency code (default: RWF) |
| effective_from | Date | Start date for this price |
| effective_to | Date | End date (null = currently active) |
| set_by | Integer | Admin user who set the price |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Last update timestamp |

### 2. Payment

Stores individual payment submissions from residents.

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| resident_id | Integer | Foreign key to users table |
| zone_id | Integer | Foreign key to zones table |
| amount | Float | Payment amount |
| currency | String | Currency code |
| payment_month | Integer | Month (1-12) |
| payment_year | Integer | Year |
| payment_method | String | mobile_money, bank_transfer, cash |
| transaction_reference | String | Transaction ID/reference |
| proof_url | String | URL to payment proof/receipt |
| status | Enum | pending, approved, rejected |
| rejection_reason | Text | Reason for rejection |
| reviewed_by | Integer | User who reviewed the payment |
| reviewed_at | DateTime | When the payment was reviewed |
| submitted_at | DateTime | submission timestamp |
| updated_at | DateTime | Last update timestamp |

**Constraint:** Unique combination of (resident_id, payment_month, payment_year) - one payment per month.

### 3. Notification

Stores notifications for users when payments are approved/rejected.

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to users table |
| title | String | Notification title |
| message | Text | Notification content |
| notification_type | Enum | payment_approved, payment_rejected, payment_reminder, general |
| reference_id | Integer | Related entity ID (e.g., payment_id) |
| reference_type | String | Type of related entity |
| is_read | Boolean | Read status |
| created_at | DateTime | Creation timestamp |

---

## API Endpoints

### Base URL: `/api/payments`

### Monthly Price Management (Admin Only)

#### Set Monthly Price
```
POST /api/payments/prices
Authorization: Bearer <admin_token>
Content-Type: application/json

Request Body:
{
    "zone_id": 1,
    "amount": 5000,
    "currency": "RWF",
    "effective_from": "2026-01-01",
    "effective_to": null  // optional
}

Response: 201 Created
{
    "message": "Monthly price set successfully",
    "price": { ... }
}
```

#### Get Monthly Prices
```
GET /api/payments/prices
GET /api/payments/prices?zone_id=1
GET /api/payments/prices?active=true

Authorization: Bearer <token>
- Admin: sees all zones
- Zone Operator: sees their assigned zone only
- Resident: sees their zone only
```

#### Get Current Price (Resident)
```
GET /api/payments/prices/current
Authorization: Bearer <resident_token>

Response: 200 OK
{
    "id": 1,
    "zone_id": 1,
    "zone_name": "Zone A",
    "amount": 5000,
    "currency": "RWF",
    ...
}
```

---

### Payment Submission (Resident)

#### Submit Payment
```
POST /api/payments/
Authorization: Bearer <resident_token>
Content-Type: application/json

Request Body:
{
    "payment_month": 3,
    "payment_year": 2026,
    "payment_method": "mobile_money",
    "transaction_reference": "MTN123456789",
    "proof_url": "https://cloudinary.com/receipt.jpg"
}

Response: 201 Created
{
    "message": "Payment submitted successfully. Awaiting approval.",
    "payment": { ... }
}
```

#### Get Payment History (Resident)
```
GET /api/payments/history
Authorization: Bearer <resident_token>

Response: 200 OK
{
    "payments": [ ... ],
    "summary": {
        "total_payments": 12,
        "total_paid": 60000,
        "pending_count": 1,
        "approved_count": 10,
        "rejected_count": 1
    }
}
```

---

### Payment Viewing (Role-Based)

#### List Payments
```
GET /api/payments/
GET /api/payments/?status=pending
GET /api/payments/?zone_id=1&month=3&year=2026

Authorization: Bearer <token>
- Resident: sees own payments only
- Zone Operator: sees payments in their zone only
- Admin: sees all payments across all zones
```

#### Get Single Payment
```
GET /api/payments/<payment_id>
Authorization: Bearer <token>
```

#### Get Payment Statistics
```
GET /api/payments/stats
GET /api/payments/stats?zone_id=1&month=3&year=2026

Authorization: Bearer <admin_or_zone_operator_token>

Response: 200 OK
{
    "pending": 5,
    "approved": 45,
    "rejected": 2,
    "total_approved_amount": 250000
}
```

---

### Payment Approval/Rejection (Admin & Zone Operator)

#### Approve Payment
```
PUT /api/payments/<payment_id>/approve
Authorization: Bearer <admin_or_zone_operator_token>

Response: 200 OK
{
    "message": "Payment approved successfully",
    "payment": { ... }
}
```

**Side Effect:** Creates notification for resident:
- Title: "Payment Approved"
- Message: "Your payment of X RWF for [Month] [Year] has been approved."

#### Reject Payment
```
PUT /api/payments/<payment_id>/reject
Authorization: Bearer <admin_or_zone_operator_token>
Content-Type: application/json

Request Body:
{
    "rejection_reason": "Invalid transaction reference. Please provide correct receipt."
}

Response: 200 OK
{
    "message": "Payment rejected",
    "payment": { ... }
}
```

**Side Effect:** Creates notification for resident:
- Title: "Payment Rejected"
- Message: "Your payment for [Month] [Year] has been rejected. Reason: [rejection_reason]"

---

### Notifications

#### Get Notifications
```
GET /api/payments/notifications
GET /api/payments/notifications?unread=true

Authorization: Bearer <token>
```

#### Mark Notification as Read
```
PUT /api/payments/notifications/<notification_id>/read
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
```
PUT /api/payments/notifications/read-all
Authorization: Bearer <token>
```

---

## User Flow Diagrams

### 1. Admin Sets Monthly Price

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Admin logs in                                            │
│         │                                                    │
│         ▼                                                    │
│  2. Navigate to Payments > Price Management                  │
│         │                                                    │
│         ▼                                                    │
│  3. Select Zone                                              │
│         │                                                    │
│         ▼                                                    │
│  4. Enter Amount & Effective Date                            │
│         │                                                    │
│         ▼                                                    │
│  5. POST /api/payments/prices                                │
│         │                                                    │
│         ▼                                                    │
│  6. Previous price auto-ends                                 │
│         │                                                    │
│         ▼                                                    │
│  7. New price becomes active                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Resident Submits Payment

```
┌─────────────────────────────────────────────────────────────┐
│                   RESIDENT FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Resident logs in                                         │
│         │                                                    │
│         ▼                                                    │
│  2. Navigate to Payments                                     │
│         │                                                    │
│         ▼                                                    │
│  3. GET /api/payments/prices/current                         │
│         │                                                    │
│         ▼                                                    │
│  4. View current month's price                               │
│         │                                                    │
│         ▼                                                    │
│  5. Make external payment (Mobile Money/Bank)                │
│         │                                                    │
│         ▼                                                    │
│  6. Fill payment form:                                       │
│     - Select month/year                                      │
│     - Select payment method                                  │
│     - Enter transaction reference                            │
│     - Upload payment proof                                   │
│         │                                                    │
│         ▼                                                    │
│  7. POST /api/payments/                                      │
│         │                                                    │
│         ▼                                                    │
│  8. Payment status: PENDING                                  │
│         │                                                    │
│         ▼                                                    │
│  9. Wait for approval notification                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Zone Operator Reviews Payments

```
┌─────────────────────────────────────────────────────────────┐
│                ZONE OPERATOR FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Zone Operator logs in                                    │
│         │                                                    │
│         ▼                                                    │
│  2. Navigate to Payments                                     │
│         │                                                    │
│         ▼                                                    │
│  3. GET /api/payments/?status=pending                        │
│     (Only sees payments from their assigned zone)            │
│         │                                                    │
│         ▼                                                    │
│  4. Review payment details:                                  │
│     - Resident info                                          │
│     - Amount                                                 │
│     - Transaction reference                                  │
│     - Payment proof                                          │
│         │                                                    │
│         ├────────────────┬────────────────┐                  │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│     APPROVE          REJECT         SKIP/LATER               │
│         │                │                                   │
│         ▼                ▼                                   │
│  PUT .../approve   PUT .../reject                            │
│         │          + rejection_reason                        │
│         │                │                                   │
│         ▼                ▼                                   │
│  Status: APPROVED   Status: REJECTED                         │
│         │                │                                   │
│         ▼                ▼                                   │
│  Notification sent to resident                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Admin Views All Payments

```
┌─────────────────────────────────────────────────────────────┐
│                  ADMIN VIEW FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Admin logs in                                            │
│         │                                                    │
│         ▼                                                    │
│  2. Navigate to Payments Dashboard                           │
│         │                                                    │
│         ▼                                                    │
│  3. GET /api/payments/stats                                  │
│     (View overall statistics)                                │
│         │                                                    │
│         ▼                                                    │
│  4. GET /api/payments/?zone_id=X&status=Y                    │
│     (Filter by zone, status, month, year)                    │
│         │                                                    │
│         ▼                                                    │
│  5. Admin can:                                               │
│     - View ALL payments across ALL zones                     │
│     - Approve/Reject any payment                             │
│     - Export payment reports                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5. Resident Receives Notification

```
┌─────────────────────────────────────────────────────────────┐
│               NOTIFICATION FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Payment Approved/Rejected                                   │
│         │                                                    │
│         ▼                                                    │
│  System creates Notification record                          │
│         │                                                    │
│         ▼                                                    │
│  Resident logs in                                            │
│         │                                                    │
│         ▼                                                    │
│  GET /api/payments/notifications?unread=true                 │
│         │                                                    │
│         ▼                                                    │
│  Display notification badge/list                             │
│         │                                                    │
│         ▼                                                    │
│  Resident clicks notification                                │
│         │                                                    │
│         ▼                                                    │
│  PUT /api/payments/notifications/<id>/read                   │
│         │                                                    │
│         ▼                                                    │
│  Navigate to payment details (using reference_id)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Access Control Matrix

| Action | Resident | Zone Operator | Admin |
|--------|----------|---------------|-------|
| Set monthly price | ✗ | ✗ | ✓ |
| View prices (own zone) | ✓ | ✓ | ✓ |
| View prices (all zones) | ✗ | ✗ | ✓ |
| Submit payment | ✓ | ✗ | ✗ |
| View own payments | ✓ | ✗ | ✗ |
| View zone payments | ✗ | ✓ | ✓ |
| View all payments | ✗ | ✗ | ✓ |
| Approve payment (zone) | ✗ | ✓ | ✓ |
| Approve payment (any) | ✗ | ✗ | ✓ |
| Reject payment (zone) | ✗ | ✓ | ✓ |
| Reject payment (any) | ✗ | ✗ | ✓ |
| View notifications | ✓ | ✓ | ✓ |
| View payment stats | ✗ | ✓ (zone) | ✓ (all) |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate payment for same month |
| 500 | Internal Server Error |

---

## Database Migration

After adding the payment module, run:

```bash
flask db migrate -m "Add payment, monthly_price, and notification tables"
flask db upgrade
```

---

## Sample Workflow

### Complete Payment Cycle

1. **Admin sets price:**
   - Admin sets 5000 RWF for Zone A starting 2026-01-01

2. **Resident pays:**
   - Resident in Zone A views current price: 5000 RWF
   - Makes Mobile Money payment externally
   - Submits payment with transaction reference + proof

3. **Zone Operator reviews:**
   - Sees pending payment in their zone
   - Verifies transaction reference
   - Checks payment proof
   - Clicks "Approve"

4. **Resident notified:**
   - Notification created: "Payment Approved"
   - Resident sees notification on next login
   - Payment history updated

5. **Admin oversight:**
   - Admin views payment stats across all zones
   - Can filter by zone, month, status
   - Has full approval/rejection authority
