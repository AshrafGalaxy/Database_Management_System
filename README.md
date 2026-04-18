# 🏦 Nexus Bank — Net Banking Portal

> **Database Management Systems (DBMS) Course Project**
> A full-stack, enterprise-grade internet banking platform built with FastAPI, Next.js 15, and MySQL.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Database Design](#-database-design)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)

---

## 🎯 Project Overview

Nexus Bank is a complete internet banking simulation system designed to demonstrate core DBMS concepts including:

- **Relational Schema Design** with normalized tables, foreign keys, and constraints
- **Stored Procedures & Transactions** for atomic financial operations
- **Role-Based Access Control** (Customer vs Admin)
- **Admin-Approval Workflows** for sensitive operations (card linking, loan disbursement)
- **Audit Trails** via timestamps and status tracking across all entities

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | FastAPI (Python 3.11) |
| **Database** | MySQL 8.x |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| **Auth** | bcrypt password hashing, localStorage session |
| **ORM** | Raw SQL via `mysql-connector-python` |

---

## 🗄 Database Design

The schema (`schema.sql`) contains **15 inter-related tables**:

```
Customers          — Core customer profiles with KYC status
Login              — Authentication records with brute-force lockout
Accounts           — Bank accounts (Savings/Current/FD) per customer
Transactions       — Immutable ledger with balance snapshots
Cards              — Approved, linked debit/credit cards
Card_Requests      — Admin-approval queue for card linking
Loans              — Loan lifecycle (Pending → Active → Closed)
AutoPay            — Recurring mandate definitions
Fixed_Deposits     — FD contracts with maturity tracking
Beneficiaries      — Saved transfer targets
Nominees           — Account nominees
Employees          — Bank staff directory
Branches           — Branch master data
Scheduled_Payments — Future-dated payment scheduler
```

### Key DBMS Concepts Applied

| Concept | Where Applied |
|---|---|
| **Normalization (3NF)** | Customers ↔ Accounts ↔ Transactions separation |
| **Referential Integrity** | All FKs with CASCADE/RESTRICT rules |
| **Enums & Check Constraints** | `status` fields, account types |
| **Atomic Transactions** | Fund transfers use `BEGIN / COMMIT / ROLLBACK` |
| **Indexing** | Account number, customer ID indexed |
| **Triggers** | Balance update after every transaction |
| **Stored Procedures** | EMI auto-deduction, FD maturity |

---

## ✨ Features

### 👤 Customer Portal
- **Dashboard** — Live balance, recent transactions, account switcher
- **Fund Transfers** — UPI / NEFT / RTGS / IMPS with MPIN verification
- **Card Management** — Link cards (admin-approval workflow), set limits, international toggle, hotlist
- **Card Link Requests Tracker** — Real-time status (Pending → Approved/Rejected)
- **Loan Management** — 5 loan types, EMI auto-calculator, fullAmortization schedule, repayment progress
- **Loan Tracker** — Pending application status visible immediately after apply
- **Scheduled Payments** — AutoPay mandates (Netflix, Spotify, etc.) with frequency options
- **Fixed Deposits** — Create FDs, view maturity, track interest
- **Transaction History** — Searchable ledger with repeat-transfer shortcut
- **Analytics** — Spending breakdown charts
- **KYC & Profile** — Personal details, document status
- **Security** — MPIN management, login session control

### 🛡 Admin Portal
- **KYC Approval** — Verify customer identity documents
- **Card Requests** — Approve / Reject card link requests with inline notes
- **Loan Approvals** — Review and approve pending loan applications
- **Security & Locks** — Force-unlock brute-force lockouts, deactivate accounts
- **Employee Directory** — Staff management
- **Platform KPIs** — Live liquidity, active customers, pending backlogs

---

## 📁 Project Structure

```
DBMS_CP/
├── schema.sql                  # Complete MySQL schema (run this first)
│
├── backend/
│   ├── main.py                 # FastAPI application — all 50+ API endpoints
│   └── requirements.txt        # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                        # Login page
    │   │   ├── admin/dashboard/page.tsx        # Admin portal
    │   │   └── dashboard/[customer_id]/
    │   │       ├── page.tsx                    # Main customer dashboard
    │   │       ├── cards/page.tsx              # Card management
    │   │       ├── loans/page.tsx              # Loan management
    │   │       ├── scheduled/page.tsx          # Scheduled payments
    │   │       ├── fixed-deposits/page.tsx     # FD management
    │   │       ├── transactions/page.tsx       # Transaction history
    │   │       ├── transfers/page.tsx          # Fund transfer
    │   │       ├── beneficiaries/page.tsx      # Saved payees
    │   │       ├── nominees/page.tsx           # Nominees
    │   │       ├── profile/page.tsx            # Customer profile
    │   │       ├── security/page.tsx           # Security settings
    │   │       └── settings/page.tsx           # Account settings
    │   ├── components/
    │   │   ├── MegaNavbar.tsx                  # Main navigation
    │   │   ├── ScheduledPayments.tsx           # Dashboard schedule widget
    │   │   ├── ActionModal.tsx                 # Transfer/payment modal
    │   │   └── AnalyticsPanel.tsx              # Spending analytics
    │   └── context/
    │       ├── DashboardContext.tsx            # Active account state
    │       └── MaskingContext.tsx              # Balance masking toggle
    ├── package.json
    └── tsconfig.json
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- MySQL 8.x running locally

### 1. Database Setup

```sql
-- In MySQL Workbench or CLI:
CREATE DATABASE bank_mgmt;
USE bank_mgmt;
SOURCE schema.sql;
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Update DB credentials in main.py (line ~25):
# host='127.0.0.1', database='bank_mgmt', user='root', password='YOUR_PASSWORD'

# Start the API server
uvicorn main:app --reload --port 8000
```

API will be available at: `http://127.0.0.1:8000`  
Swagger docs: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

App will be available at: `http://localhost:3000`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Customer/Admin login with brute-force protection |
| POST | `/api/logout` | Session invalidation |

### Accounts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/accounts/{customer_id}` | List all accounts |
| GET | `/api/accounts/summary/{account_number}` | Account details + balance |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transfer` | Fund transfer (atomic, MPIN-verified) |
| GET | `/api/transactions/{account_number}` | Transaction history |

### Cards
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/cards/link` | Submit card link request (creates Card_Request) |
| GET | `/api/cards/{account_number}` | List approved cards |
| GET | `/api/cards/requests/{account_number}` | Track card link requests |
| PUT | `/api/cards/update` | Update limits / international enable |
| PUT | `/api/cards/hotlist/{card_id}` | Permanently block card |

### Loans
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/loans/apply` | Apply for loan (auto-calculates EMI, status=Pending) |
| GET | `/api/loans/{account_number}` | List all loans with status |
| GET | `/api/loans/amortization/{loan_id}` | Full amortization schedule |

### AutoPay
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/autopay/setup` | Create mandate (future dates only) |
| GET | `/api/autopay/{account_number}` | List mandates |
| PUT | `/api/autopay/cancel/{id}` | Cancel mandate |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform KPIs |
| GET | `/api/admin/card-requests` | All card link requests |
| PUT | `/api/admin/card-requests/approve/{id}` | Approve → inserts into Cards |
| PUT | `/api/admin/card-requests/reject/{id}` | Reject with admin note |
| GET | `/api/admin/loans/pending` | Pending loan queue |
| PUT | `/api/admin/loans/approve/{id}` | Activate loan |
| PUT | `/api/admin/kyc/{customer_id}` | Approve KYC |



## 📄 License

This project is developed for academic purposes as part of a DBMS course curriculum.
