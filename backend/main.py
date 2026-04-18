from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional
import mysql.connector
from mysql.connector import Error
import bcrypt
import re
import math
from datetime import date, datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='127.0.0.1',
            database='bank_mgmt',
            user='root',
            password='WhiteGalaxy@29',
            port=3306
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: str
    phone: str
    dob: str
    address: str
    pan_number: str
    aadhaar_number: str
    branch_id: int
    account_type: str
    account_category: str

    @validator('pan_number')
    def validate_pan(cls, v):
        if v and not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', v):
            raise ValueError('Invalid PAN format. Expected: ABCDE1234F')
        return v
        
    @validator('aadhaar_number')
    def validate_aadhaar(cls, v):
        if v and not re.match(r'^\d{12}$', v):
            raise ValueError('Aadhaar must be exactly 12 digits.')
        return v
        
class ActionRequest(BaseModel):
    account_number: str
    amount: float
    channel: str = "UPI"
    description: str = "Bank transaction"

class TransferRequest(BaseModel):
    sender_account: str
    receiver_account: str
    amount: float
    mpin: str  # Double-Lock Auth: MPIN required for every transfer

class SetMpinRequest(BaseModel):
    customer_id: int
    mpin: str

class VerifyMpinRequest(BaseModel):
    customer_id: int
    mpin: str

class CardUpdateRequest(BaseModel):
    card_id: int
    international_enabled: Optional[bool] = None
    atm_limit: Optional[float] = None
    pos_limit: Optional[float] = None

class LinkCardRequest(BaseModel):
    account_number: str
    card_number: str          # 16-digit card number
    cvv: str                  # 3-4 digit CVV — we hash and store
    expiry_month: int         # 1-12
    expiry_year: int          # e.g. 2028
    card_type: str            # 'debit' or 'credit'
    card_network: str         # 'Visa', 'Mastercard', 'RuPay', 'Amex'

class FdCalcRequest(BaseModel):
    principal: float
    rate_percent: float   # annual rate e.g. 7.5
    tenure_years: float   # e.g. 1.5 for 18 months

class NomineeRequest(BaseModel):
    account_number: str
    nominee_name: str
    relationship: str
    age: int

class UpdatePasswordRequest(BaseModel):
    customer_id: int
    old_password: str
    new_password: str

class VerifyPasswordRequest(BaseModel):
    customer_id: int
    password: str

class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

@app.post("/api/register")
def register(request: RegisterRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        # Age validation: Must be >= 18
        dob_parsed = datetime.strptime(request.dob, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - dob_parsed.year - ((today.month, today.day) < (dob_parsed.month, dob_parsed.day))
        if age < 18:
            raise HTTPException(status_code=400, detail="Registration denied: Applicant must be at least 18 years of age.")

        # 1. Insert Customer (KYC starts as Pending — Admin Approval queue)
        query_cust = """
        INSERT INTO Customers (first_name, last_name, date_of_birth, address, email, phone, kyc_status, pan_number, aadhaar_number)
        VALUES (%s, %s, %s, %s, %s, %s, 'Pending', %s, %s)
        """
        cursor.execute(query_cust, (request.first_name, request.last_name, request.dob, request.address, request.email, request.phone, request.pan_number, request.aadhaar_number))
        customer_id = cursor.lastrowid

        # 2. Setup Login
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(request.password.encode('utf-8'), salt).decode('utf-8')

        query_login = """
        INSERT INTO Login (username, password_hash, role, customer_id)
        VALUES (%s, %s, 'user', %s)
        """
        cursor.execute(query_login, (request.username, hashed_pw, customer_id))

        # 3. Dynamic Account Configuration
        min_balance = 0.00
        overdraft = 0.00
        if request.account_type.casefold() == "savings":
            if request.account_category.casefold() == "regular": min_balance = 5000.00
            elif request.account_category.casefold() == "senior citizen": min_balance = 2500.00
        elif request.account_type.casefold() == "current":
            if request.account_category.casefold() == "premium": overdraft = 50000.00
            else: min_balance = 10000.00
            
        acc_num = f"ACC{str(customer_id).zfill(10)}"
        query_acc = """
        INSERT INTO Accounts (account_number, customer_id, branch_id, account_type, account_category, balance, min_balance, overdraft_limit, status)
        VALUES (%s, %s, %s, %s, %s, 0.00, %s, %s, 'active')
        """
        cursor.execute(query_acc, (
            acc_num, customer_id, request.branch_id, 
            request.account_type.lower(), request.account_category,
            min_balance, overdraft
        ))

        conn.commit()
        return {"success": True, "message": "Application received. Account pending Admin KYC approval."}
    except HTTPException:
        raise
    except mysql.connector.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Registration block: Unique identity parameters (email/phone/username) already exist.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/branches")
def get_branches():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT branch_id, ifsc_code, branch_name, city FROM Branches")
        return {"branches": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/login")
def login(request: LoginRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT login_id, username, password_hash, role, customer_id, employee_id, failed_attempts, locked_until, last_login FROM Login WHERE username = %s"
        cursor.execute(query, (request.username,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        from datetime import datetime
        if user['locked_until'] and user['locked_until'] > datetime.now():
            raise HTTPException(status_code=403, detail=f"Account locked until {user['locked_until']}. Please try again later.")
            
        if not bcrypt.checkpw(request.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            failed_attempts = user['failed_attempts'] + 1
            if failed_attempts >= 3:
                cursor.execute("UPDATE Login SET failed_attempts = %s, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE username = %s", (failed_attempts, request.username))
            else:
                cursor.execute("UPDATE Login SET failed_attempts = %s WHERE username = %s", (failed_attempts, request.username))
            conn.commit()
            raise HTTPException(status_code=401, detail="Invalid username or password")

        # Capture previous last_login BEFORE overwriting it — this is shown as "Last session" in dashboard
        previous_last_login = user['last_login']
        previous_last_login_str = previous_last_login.strftime("%Y-%m-%dT%H:%M:%S") if previous_last_login else None

        cursor.execute("UPDATE Login SET failed_attempts = 0, locked_until = NULL, last_login = NOW() WHERE username = %s", (request.username,))
        conn.commit()
        
        return {
            "success": True,
            "role": user['role'],
            "customer_id": user['customer_id'],
            "username": user['username'],
            "last_login": previous_last_login_str
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/dashboard/{customer_id}")
def get_dashboard(customer_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM vw_customer_account_summary WHERE customer_id = %s"
        cursor.execute(query, (customer_id,))
        accounts = cursor.fetchall()
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/transactions/{account_number}")
def get_transactions(account_number: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT t.* FROM Transactions t
        JOIN Accounts a ON t.account_id = a.account_id
        WHERE a.account_number = %s
        ORDER BY t.transaction_date DESC
        """
        cursor.execute(query, (account_number,))
        transactions = cursor.fetchall()
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/deposit")
def deposit(request: ActionRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        result = cursor.callproc('sp_deposit', (request.account_number, request.amount, request.channel, request.description, ''))
        result_msg = result[4]
        conn.commit()
        
        if result_msg and result_msg.startswith("ERROR"):
            raise HTTPException(status_code=400, detail=result_msg)
            
        return {"success": True, "message": result_msg}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/withdraw")
def withdraw(request: ActionRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        result = cursor.callproc('sp_withdraw', (request.account_number, request.amount, request.channel, request.description, ''))
        result_msg = result[4]
        conn.commit()
        
        if result_msg and result_msg.startswith("ERROR"):
            raise HTTPException(status_code=400, detail=result_msg)
            
        return {"success": True, "message": result_msg}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/cards/{account_number}")
def get_cards(account_number: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT c.* FROM Cards c
        JOIN Accounts a ON c.account_id = a.account_id
        WHERE a.account_number = %s
        """
        cursor.execute(query, (account_number,))
        cards = cursor.fetchall()
        return {"cards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/api/nominees/{account_number}")
def get_nominees(account_number: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT n.* FROM Nominees n
        JOIN Accounts a ON n.account_id = a.account_id
        WHERE a.account_number = %s
        """
        cursor.execute(query, (account_number,))
        nominees = cursor.fetchall()
        return {"nominees": nominees}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/transfer")
def transfer_funds(request: TransferRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        # --- DOUBLE-LOCK AUTH: Verify MPIN before any transfer ---
        cursor.execute(
            "SELECT l.mpin_hash FROM Login l "
            "JOIN Accounts a ON l.customer_id = a.customer_id "
            "WHERE a.account_number = %s",
            (request.sender_account,)
        )
        login_row = cursor.fetchone()
        if not login_row or not login_row['mpin_hash']:
            raise HTTPException(status_code=403, detail="Transaction PIN not set. Please set your MPIN in profile settings before transferring.")
        if not bcrypt.checkpw(request.mpin.encode('utf-8'), login_row['mpin_hash'].encode('utf-8')):
            raise HTTPException(status_code=403, detail="Authentication Failed: Invalid Transaction PIN (MPIN).")

        # --- TRANSFER ROUTING ENGINE ---
        # > ₹2,00,000 = RTGS | ₹2,00,000 >= x > ₹2,00,00 (NEFT threshold) | else = IMPS
        # This is stored in the DB via the transaction_channel; sp_transfer handles the rest.
        # We surface routing_mode to the frontend for display purposes.
        if request.amount > 200000:
            routing_mode = "RTGS"
        elif request.amount > 10000:
            routing_mode = "NEFT"
        else:
            routing_mode = "IMPS"

        cursor2 = conn.cursor()
        args = (request.sender_account, request.receiver_account, request.amount, "")
        result = cursor2.callproc('sp_transfer', args)
        result_msg = result[3]
        conn.commit()

        if result_msg and result_msg.startswith("ERROR"):
            raise HTTPException(status_code=400, detail=result_msg)

        return {"success": True, "message": result_msg, "routing_mode": routing_mode}
    except HTTPException:
        raise
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Admin Endpoints
@app.get("/api/admin/stats")
def get_admin_stats():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM vw_admin_analytics;")
        stats = cursor.fetchone()
        return {"stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/customers")
def get_admin_customers():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT 
            c.customer_id, 
            CONCAT(c.first_name, ' ', c.last_name) AS name,
            c.email,
            c.phone,
            c.kyc_status,
            COALESCE(SUM(a.balance), 0) AS total_balance
        FROM Customers c
        LEFT JOIN Accounts a ON c.customer_id = a.customer_id AND a.status = 'active'
        GROUP BY c.customer_id
        ORDER BY c.customer_id ASC
        """
        cursor.execute(query)
        customers = cursor.fetchall()
        return {"customers": customers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/kyc/{customer_id}")
def update_kyc_status(customer_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Customers SET kyc_status = 'Verified' WHERE customer_id = %s", (customer_id,))
        conn.commit()
        return {"success": True, "message": "KYC status updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# --- ADMIN COMPONENT 3 (Database Orphans Utilization) ---

@app.get("/api/admin/employees")
def get_employees():
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Employees;")
        return {"employees": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/security")
def get_security_locks():
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT login_id, username, role, failed_attempts, locked_until FROM Login WHERE failed_attempts > 0 OR locked_until IS NOT NULL;")
        return {"locks": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/security/unlock/{username}")
def unlock_user(username: str):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Login SET failed_attempts = 0, locked_until = NULL WHERE username = %s", (username,))
        conn.commit()
        return {"success": True, "message": "Security traces forcefully dropped."}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/admin/loans/pending")
def get_pending_loans():
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Loans WHERE status = 'Pending';")
        return {"pending_loans": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/admin/loans/approve/{loan_id}")
def approve_loan(loan_id: int):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Loans SET status = 'Active' WHERE loan_id = %s", (loan_id,))
        conn.commit()
        return {"success": True, "message": "Loan queue cleared securely."}
    finally:
        cursor.close()
        conn.close()

# Financial Analytics & Statements
@app.get("/api/statement/{account_number}")
def get_statement(account_number: str, start_date: str, end_date: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc('sp_get_account_statement', (account_number, start_date, end_date))
        
        statement = []
        for result in cursor.stored_results():
            statement = result.fetchall()
            
        return {"statement": statement}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/analytics/{account_number}")
def get_analytics(account_number: str):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM vw_account_cash_flow WHERE account_number = %s", (account_number,))
        analytics = cursor.fetchall()
        return {"analytics": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# --- SCHEDULED PAYMENTS (Loans & AutoPay) ---

class LoanRequest(BaseModel):
    account_number: str
    loan_type: str        # 'Personal', 'Home', 'Car', 'Education', 'Business'
    total_amount: float
    tenure_months: int    # e.g. 12, 24, 36, 60, 120, 240
    interest_rate: float  # annual % e.g. 10.5

class AutoPayRequest(BaseModel):
    account_number: str
    merchant_name: str
    amount: float
    next_due_date: str

def get_account_id(cursor, account_number: str) -> int:
    cursor.execute("SELECT account_id FROM Accounts WHERE account_number = %s", (account_number,))
    res = cursor.fetchone()
    if not res:
        raise HTTPException(status_code=404, detail="Account not found")
    return res['account_id']

@app.post("/api/loans/apply")
def apply_loan(request: LoanRequest):
    """Apply for a loan — status starts as Pending, forwarded to admin queue."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        acc_id = get_account_id(cursor, request.account_number)
        if request.total_amount <= 0:
            raise HTTPException(status_code=400, detail="Loan amount must be positive.")
        if request.tenure_months < 1 or request.tenure_months > 360:
            raise HTTPException(status_code=400, detail="Tenure must be between 1 and 360 months.")
        if request.interest_rate <= 0 or request.interest_rate > 50:
            raise HTTPException(status_code=400, detail="Interest rate must be between 0.01% and 50%.")
        # Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
        r = request.interest_rate / 12 / 100
        n = request.tenure_months
        emi = request.total_amount * r * math.pow(1 + r, n) / (math.pow(1 + r, n) - 1) if r > 0 else request.total_amount / n
        emi = round(emi, 2)
        from datetime import date, timedelta
        nxt = date.today().replace(day=1) + timedelta(days=32)
        next_due = nxt.replace(day=1)  # first of next month
        cursor.execute(
            "INSERT INTO Loans (account_id, total_amount, emi_amount, remaining_amount, next_due_date, status) VALUES (%s, %s, %s, %s, %s, 'Pending')",
            (acc_id, request.total_amount, emi, request.total_amount, next_due)
        )
        conn.commit()
        return {"success": True, "pending": True, "emi_calculated": emi,
                "message": f"Loan application of \u20b9{request.total_amount:,.0f} submitted. Awaiting admin approval."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/loans/{account_number}")
def get_loans(account_number: str):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        acc_id = get_account_id(cursor, account_number)
        cursor.execute("SELECT * FROM Loans WHERE account_id = %s ORDER BY next_due_date ASC", (acc_id,))
        return {"loans": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/autopay/setup")
def setup_autopay(request: AutoPayRequest):
    """Set up an AutoPay mandate. next_due_date must be today or in the future."""
    from datetime import date as d_date, datetime
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        # Validation
        if not request.merchant_name or not request.merchant_name.strip():
            raise HTTPException(status_code=400, detail="Merchant name is required.")
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
        try:
            due = datetime.strptime(request.next_due_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        if due < d_date.today():
            raise HTTPException(status_code=400, detail="Billing date cannot be in the past. Please select today or a future date.")

        acc_id = get_account_id(cursor, request.account_number)
        cursor.execute(
            "INSERT INTO AutoPay (account_id, merchant_name, amount, next_due_date) VALUES (%s, %s, %s, %s)",
            (acc_id, request.merchant_name.strip(), request.amount, request.next_due_date)
        )
        conn.commit()
        return {"success": True, "message": f"AutoPay mandate for {request.merchant_name.strip()} set up successfully."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.put("/api/autopay/cancel/{autopay_id}")
def cancel_autopay(autopay_id: int):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE AutoPay SET status = 'Cancelled' WHERE autopay_id = %s", (autopay_id,))
        conn.commit()
        return {"success": True}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/autopay/{account_number}")
def get_autopay(account_number: str):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        acc_id = get_account_id(cursor, account_number)
        cursor.execute("SELECT * FROM AutoPay WHERE account_id = %s ORDER BY next_due_date ASC", (acc_id,))
        return {"autopays": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()

# =================================================================
# PHASE 12: ENTERPRISE ENDPOINTS
# =================================================================

# --- MPIN Management ---

@app.post("/api/mpin/set")
def set_mpin(request: SetMpinRequest):
    """Set or update the Transaction MPIN for a customer."""
    if len(request.mpin) != 6 or not request.mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be exactly 6 digits.")
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        salt = bcrypt.gensalt()
        hashed_mpin = bcrypt.hashpw(request.mpin.encode('utf-8'), salt).decode('utf-8')
        cursor.execute(
            "UPDATE Login SET mpin_hash = %s WHERE customer_id = %s",
            (hashed_mpin, request.customer_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer login record not found.")
        return {"success": True, "message": "Transaction PIN set successfully."}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/mpin/verify")
def verify_mpin(request: VerifyMpinRequest):
    """Standalone MPIN verification check (used by frontend before step 3 of transfer wizard)."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT mpin_hash FROM Login WHERE customer_id = %s",
            (request.customer_id,)
        )
        row = cursor.fetchone()
        if not row or not row['mpin_hash']:
            raise HTTPException(status_code=403, detail="No Transaction PIN configured. Set MPIN first.")
        if not bcrypt.checkpw(request.mpin.encode('utf-8'), row['mpin_hash'].encode('utf-8')):
            raise HTTPException(status_code=403, detail="Authentication Failed: Incorrect Transaction PIN.")
        return {"success": True, "message": "MPIN verified."}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/mpin/status/{customer_id}")
def get_mpin_status(customer_id: int):
    """Check if a customer has an MPIN configured (returns bool, never the hash)."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT mpin_hash FROM Login WHERE customer_id = %s", (customer_id,))
        row = cursor.fetchone()
        is_set = bool(row and row['mpin_hash'])
        return {"mpin_configured": is_set}
    finally:
        cursor.close()
        conn.close()

# --- Card Security Management ---

@app.put("/api/cards/hotlist/{card_id}")
def hotlist_card(card_id: int):
    """Permanently block (hotlist) a card. This action is irreversible."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Cards SET is_active = FALSE WHERE card_id = %s", (card_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Card not found.")
        return {"success": True, "message": "Card has been permanently blocked (Hotlisted)."}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/cards/update")
def update_card_settings(request: CardUpdateRequest):
    """Update card security limits and international toggle."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify card is active before modifying
        cursor.execute("SELECT is_active FROM Cards WHERE card_id = %s", (request.card_id,))
        card = cursor.fetchone()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found.")
        if not card['is_active']:
            raise HTTPException(status_code=400, detail="Cannot modify a hotlisted card.")

        fields, values = [], []
        if request.international_enabled is not None:
            fields.append("international_enabled = %s")
            values.append(request.international_enabled)
        if request.atm_limit is not None:
            if request.atm_limit > 200000:
                raise HTTPException(status_code=400, detail="ATM limit cannot exceed ₹2,00,000.")
            fields.append("atm_limit = %s")
            values.append(request.atm_limit)
        if request.pos_limit is not None:
            if request.pos_limit > 500000:
                raise HTTPException(status_code=400, detail="POS limit cannot exceed ₹5,00,000.")
            fields.append("pos_limit = %s")
            values.append(request.pos_limit)

        if not fields:
            raise HTTPException(status_code=400, detail="No update fields provided.")

        values.append(request.card_id)
        cursor2 = conn.cursor()
        cursor2.execute(f"UPDATE Cards SET {', '.join(fields)} WHERE card_id = %s", values)
        conn.commit()
        return {"success": True, "message": "Card settings updated successfully."}
    finally:
        cursor.close()
        conn.close()


# --- Card Linking (self-service) ---

@app.post("/api/cards/link")
def link_card(request: LinkCardRequest):
    """Submit a card link request — routed to admin for approval."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Validate account
        cursor.execute("SELECT account_id FROM Accounts WHERE account_number = %s AND status = 'active'", (request.account_number,))
        acc = cursor.fetchone()
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found or inactive.")

        # 2. Card number format (16 digits)
        if not re.match(r'^\d{16}$', request.card_number):
            raise HTTPException(status_code=400, detail="Card number must be exactly 16 digits.")

        # 3. CVV digits
        amex = request.card_network.lower() == 'amex'
        if amex and not re.match(r'^\d{4}$', request.cvv):
            raise HTTPException(status_code=400, detail="Amex CVV must be 4 digits.")
        if not amex and not re.match(r'^\d{3}$', request.cvv):
            raise HTTPException(status_code=400, detail="CVV must be 3 digits.")

        # 4. Expiry validation
        from datetime import date as d_date
        if request.expiry_month < 1 or request.expiry_month > 12:
            raise HTTPException(status_code=400, detail="Invalid expiry month.")
        expiry = d_date(request.expiry_year, request.expiry_month, 1)
        if expiry < d_date.today().replace(day=1):
            raise HTTPException(status_code=400, detail="Card has already expired.")
        expiry_date = d_date(request.expiry_year, request.expiry_month, 28)

        # 5. Duplicate check (Cards + pending Card_Requests)
        cursor.execute("SELECT card_id FROM Cards WHERE card_number = %s", (request.card_number,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="This card number is already linked to an account.")
        cursor.execute("SELECT request_id FROM Card_Requests WHERE card_number = %s AND status = 'Pending'", (request.card_number,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="A pending request for this card number already exists.")

        # 6. Hash CVV
        cvv_hash = bcrypt.hashpw(request.cvv.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # 7. Insert into Card_Requests (NOT Cards — admin must approve)
        cursor2 = conn.cursor()
        cursor2.execute(
            "INSERT INTO Card_Requests (account_id, card_number, card_type, card_network, expiry_date, cvv_hash) VALUES (%s, %s, %s, %s, %s, %s)",
            (acc['account_id'], request.card_number, request.card_type.lower(), request.card_network, expiry_date, cvv_hash)
        )
        conn.commit()
        return {
            "success": True,
            "pending": True,
            "message": f"{request.card_network} {request.card_type.capitalize()} card ending in {request.card_number[-4:]} has been submitted for admin verification. You can track the status in Card Management."
        }
    except HTTPException:
        raise
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="Duplicate card request.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.put("/api/cards/unblock/{card_id}")
def unblock_card(card_id: int):
    """Temporarily unblock a card that was soft-blocked (not hotlisted)."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT is_active FROM Cards WHERE card_id = %s", (card_id,))
        card = cursor.fetchone()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found.")
        if card['is_active']:
            raise HTTPException(status_code=400, detail="Card is already active.")
        cursor.execute("UPDATE Cards SET is_active = TRUE WHERE card_id = %s", (card_id,))
        conn.commit()
        return {"success": True, "message": "Card has been unblocked successfully."}
    finally:
        cursor.close()
        conn.close()


# --- Card Request Tracking (User) ---

@app.get("/api/cards/requests/{account_number}")
def get_card_requests(account_number: str):
    """Get all card link requests for an account (user-facing tracker)."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT account_id FROM Accounts WHERE account_number = %s", (account_number,))
        acc = cursor.fetchone()
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found.")
        cursor.execute(
            """SELECT request_id, card_number, card_type, card_network, expiry_date,
                      status, admin_note, requested_at, actioned_at
               FROM Card_Requests WHERE account_id = %s ORDER BY requested_at DESC""",
            (acc['account_id'],)
        )
        rows = cursor.fetchall()
        for r in rows:
            if r['expiry_date']: r['expiry_date'] = str(r['expiry_date'])
            if r['requested_at']: r['requested_at'] = str(r['requested_at'])
            if r['actioned_at']: r['actioned_at'] = str(r['actioned_at'])
        return {"requests": rows}
    finally:
        cursor.close()
        conn.close()


# --- Card Requests (Admin) ---

@app.get("/api/admin/card-requests")
def admin_get_card_requests():
    """Admin: list all card link requests with status."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """SELECT cr.request_id, cr.card_number, cr.card_type, cr.card_network,
                      cr.expiry_date, cr.status, cr.admin_note, cr.requested_at,
                      a.account_number,
                      CONCAT(c.first_name, ' ', c.last_name) AS customer_name
               FROM Card_Requests cr
               JOIN Accounts a ON cr.account_id = a.account_id
               JOIN Customers c ON a.customer_id = c.customer_id
               ORDER BY FIELD(cr.status,'Pending','Approved','Rejected'), cr.requested_at DESC"""
        )
        rows = cursor.fetchall()
        for r in rows:
            if r['expiry_date']: r['expiry_date'] = str(r['expiry_date'])
            if r['requested_at']: r['requested_at'] = str(r['requested_at'])
        return {"card_requests": rows}
    finally:
        cursor.close()
        conn.close()


class CardRequestActionRequest(BaseModel):
    admin_note: Optional[str] = None


@app.put("/api/admin/card-requests/approve/{request_id}")
def admin_approve_card_request(request_id: int):
    """Admin approves a card link request — card is inserted into Cards table."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Card_Requests WHERE request_id = %s", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found.")
        if req['status'] != 'Pending':
            raise HTTPException(status_code=400, detail=f"Request is already {req['status']}.")

        # Insert into actual Cards table
        cursor.execute(
            "INSERT INTO Cards (card_number, account_id, card_type, card_network, expiry_date, cvv_hash) VALUES (%s, %s, %s, %s, %s, %s)",
            (req['card_number'], req['account_id'], req['card_type'], req['card_network'], req['expiry_date'], req['cvv_hash'])
        )
        # Mark request as Approved
        cursor.execute(
            "UPDATE Card_Requests SET status='Approved', actioned_at=NOW() WHERE request_id=%s",
            (request_id,)
        )
        conn.commit()
        return {"success": True, "message": f"Card ending in {req['card_number'][-4:]} approved and activated."}
    except HTTPException:
        raise
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=409, detail="Card number already exists in the system.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.put("/api/admin/card-requests/reject/{request_id}")
def admin_reject_card_request(request_id: int, body: CardRequestActionRequest):
    """Admin rejects a card link request with an optional note."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT status FROM Card_Requests WHERE request_id = %s", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found.")
        if req['status'] != 'Pending':
            raise HTTPException(status_code=400, detail=f"Request is already {req['status']}.")
        cursor.execute(
            "UPDATE Card_Requests SET status='Rejected', admin_note=%s, actioned_at=NOW() WHERE request_id=%s",
            (body.admin_note or "Request rejected by admin.", request_id)
        )
        conn.commit()
        return {"success": True, "message": "Card request rejected."}
    finally:
        cursor.close()
        conn.close()


# --- FD Interest Calculator ---

@app.post("/api/calculator/fd")
def calculate_fd(request: FdCalcRequest):
    """
    Compound Interest formula: A = P(1 + r/n)^(nt)
    Compounded quarterly (n=4) per standard Indian banking practice.
    """
    if request.principal <= 0 or request.rate_percent <= 0 or request.tenure_years <= 0:
        raise HTTPException(status_code=400, detail="All values must be positive.")
    n = 4  # Compounded quarterly
    r = request.rate_percent / 100
    t = request.tenure_years
    maturity_amount = request.principal * math.pow((1 + r / n), n * t)
    interest_earned = maturity_amount - request.principal
    return {
        "principal": round(request.principal, 2),
        "rate_percent": request.rate_percent,
        "tenure_years": request.tenure_years,
        "maturity_amount": round(maturity_amount, 2),
        "interest_earned": round(interest_earned, 2),
        "compounding": "Quarterly"
    }

# --- Loan Amortization Schedule ---

@app.get("/api/loans/amortization/{loan_id}")
def get_amortization_schedule(loan_id: int):
    """Generate an amortization schedule for a given loan, showing monthly EMI breakdown."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT total_amount, emi_amount, remaining_amount, next_due_date FROM Loans WHERE loan_id = %s",
            (loan_id,)
        )
        loan = cursor.fetchone()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found.")

        total = float(loan['total_amount'])
        emi = float(loan['emi_amount'])
        remaining = float(loan['remaining_amount'])

        # Calculate total number of EMIs
        total_emis = math.ceil(total / emi) if emi > 0 else 0
        paid_emis = math.floor((total - remaining) / emi) if emi > 0 else 0

        schedule = []
        balance = total
        for i in range(1, total_emis + 1):
            payment = min(emi, balance)
            balance = round(balance - payment, 2)
            schedule.append({
                "installment": i,
                "emi_amount": round(payment, 2),
                "balance_after": balance,
                "status": "Paid" if i <= paid_emis else "Pending"
            })

        return {
            "loan_id": loan_id,
            "total_amount": total,
            "emi_amount": emi,
            "remaining_amount": remaining,
            "total_installments": total_emis,
            "paid_installments": paid_emis,
            "pending_installments": total_emis - paid_emis,
            "schedule": schedule
        }
    finally:
        cursor.close()
        conn.close()

# --- Admin: Senior Citizen Analytics ---

@app.get("/api/admin/senior-citizens")
def get_senior_citizens():
    """Fetch all senior citizen account holders (age >= 60) via the DB view."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM vw_customer_account_summary WHERE account_category = 'Senior Citizen' ORDER BY date_of_birth ASC"
        cursor.execute(query)
        return {"senior_citizens": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()


# ─── Beneficiary Management ───────────────────────────────────────────────────

class AddBeneficiaryRequest(BaseModel):
    customer_id: int
    payee_account_number: str
    nickname: str

@app.get("/api/beneficiaries/{customer_id}")
def list_beneficiaries(customer_id: int):
    """List all saved beneficiaries for a customer with cooling-period status."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                sb.beneficiary_id,
                sb.payee_account_number,
                sb.nickname,
                sb.added_at,
                sb.penny_drop_verified,
                TIMESTAMPDIFF(HOUR, sb.added_at, NOW()) AS hours_since_added,
                CASE
                    WHEN TIMESTAMPDIFF(HOUR, sb.added_at, NOW()) < 24 THEN TRUE
                    ELSE FALSE
                END AS cooling_period_active,
                c2.first_name, c2.last_name
            FROM Saved_Beneficiaries sb
            LEFT JOIN Accounts a2 ON sb.payee_account_number = a2.account_number
            LEFT JOIN Customers c2 ON a2.customer_id = c2.customer_id
            WHERE sb.customer_id = %s
            ORDER BY sb.added_at DESC
        """, (customer_id,))
        rows = cursor.fetchall()
        # Convert datetime to string for JSON serialisation
        for r in rows:
            if r.get("added_at"):
                r["added_at"] = r["added_at"].strftime("%Y-%m-%d %H:%M:%S")
        return {"beneficiaries": rows}
    finally:
        cursor.close()
        conn.close()


@app.post("/api/beneficiaries/add")
def add_beneficiary(request: AddBeneficiaryRequest):
    """Add a new beneficiary (payee). Sets added_at to NOW() — starts 24-hr cooling period."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify payee account exists and is active
        cursor.execute(
            "SELECT account_id, customer_id FROM Accounts WHERE account_number = %s AND status = 'active'",
            (request.payee_account_number,)
        )
        payee = cursor.fetchone()
        if not payee:
            raise HTTPException(status_code=404, detail="Payee account not found or inactive.")

        # Prevent self-adding
        cursor.execute(
            "SELECT customer_id FROM Accounts WHERE account_number = %s LIMIT 1",
            (request.payee_account_number,)
        )
        payee_cust = cursor.fetchone()
        if payee_cust and payee_cust["customer_id"] == request.customer_id:
            raise HTTPException(status_code=400, detail="Cannot add your own account as a beneficiary.")

        # Check for duplicate
        cursor.execute(
            "SELECT beneficiary_id FROM Saved_Beneficiaries WHERE customer_id = %s AND payee_account_number = %s",
            (request.customer_id, request.payee_account_number)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="This account is already in your saved beneficiaries.")

        cursor.execute(
            """INSERT INTO Saved_Beneficiaries
               (customer_id, payee_account_number, nickname, added_at, penny_drop_verified)
               VALUES (%s, %s, %s, NOW(), TRUE)""",
            (request.customer_id, request.payee_account_number, request.nickname)
        )
        conn.commit()
        return {
            "success": True,
            "message": f"Beneficiary '{request.nickname}' added. RBI 24-hour cooling period is now active — transfers above ₹10,000 will be unlocked after 24 hours.",
            "beneficiary_id": cursor.lastrowid
        }
    except HTTPException:
        raise
    except mysql.connector.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Beneficiary already exists.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/beneficiaries/{beneficiary_id}")
def delete_beneficiary(beneficiary_id: int):
    """Remove a saved beneficiary."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Saved_Beneficiaries WHERE beneficiary_id = %s", (beneficiary_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Beneficiary not found.")
        conn.commit()
        return {"success": True, "message": "Beneficiary removed."}
    finally:
        cursor.close()
        conn.close()


# ─── Nominee CRUD (Group 1 Audit Fix) ────────────────────────────────────────

@app.post("/api/nominees/add")
def add_nominee(request: NomineeRequest):
    """Add a nominee to an account."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT account_id FROM Accounts WHERE account_number = %s AND status = 'active'",
            (request.account_number,)
        )
        acc = cursor.fetchone()
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found or inactive.")
        if request.age < 0 or request.age > 120:
            raise HTTPException(status_code=400, detail="Invalid age.")
        cursor.execute(
            "INSERT INTO Nominees (account_id, nominee_name, relationship, age) VALUES (%s, %s, %s, %s)",
            (acc['account_id'], request.nominee_name, request.relationship, request.age)
        )
        conn.commit()
        return {"success": True, "nominee_id": cursor.lastrowid, "message": f"Nominee '{request.nominee_name}' added successfully."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/nominees/{nominee_id}")
def delete_nominee(nominee_id: int):
    """Remove a nominee from an account."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Nominees WHERE nominee_id = %s", (nominee_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Nominee not found.")
        conn.commit()
        return {"success": True, "message": "Nominee removed."}
    finally:
        cursor.close()
        conn.close()


# ─── Profile Endpoint (Group 2 Audit Fix) ────────────────────────────────────

@app.get("/api/profile/{customer_id}")
def get_profile(customer_id: int):
    """Return full customer profile including address, DOB and account opened dates."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT c.customer_id, c.first_name, c.last_name, c.email, c.phone,
                   c.address, c.date_of_birth, c.kyc_status, c.created_at AS customer_since,
                   c.pan_number, c.aadhaar_number, c.aadhaar_linked, c.cif_number,
                   GROUP_CONCAT(a.account_type ORDER BY a.opened_at SEPARATOR ', ') AS account_types
            FROM Customers c
            LEFT JOIN Accounts a ON a.customer_id = c.customer_id AND a.status = 'active'
            WHERE c.customer_id = %s
            GROUP BY c.customer_id
            """,
            (customer_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found.")
        # Serialise dates
        for field in ['date_of_birth', 'customer_since']:
            if row.get(field) and hasattr(row[field], 'strftime'):
                row[field] = row[field].strftime("%Y-%m-%d") if isinstance(row[field], date) else row[field].strftime("%Y-%m-%dT%H:%M:%S")
        return {"profile": row}
    finally:
        cursor.close()
        conn.close()


# ─── Verify Login Password (used by security page before MPIN reset) ──────────

@app.post("/api/verify-password")
def verify_password(request: VerifyPasswordRequest):
    """Verify customer's login password — called by the security page before allowing MPIN change."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password_hash FROM Login WHERE customer_id = %s", (request.customer_id,))
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(request.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid password.")
        return {"success": True}
    finally:
        cursor.close()
        conn.close()

@app.patch("/api/update-password")
def update_password(request: UpdatePasswordRequest):
    """Change Internet Banking Login Password."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Verify Old Password
        cursor.execute("SELECT password_hash FROM Login WHERE customer_id = %s", (request.customer_id,))
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(request.old_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid current password.")
            
        # 2. Update to New Password
        salt = bcrypt.gensalt()
        new_hashed = bcrypt.hashpw(request.new_password.encode('utf-8'), salt).decode('utf-8')
        
        cursor.execute("UPDATE Login SET password_hash = %s WHERE customer_id = %s", (new_hashed, request.customer_id))
        conn.commit()
        return {"success": True, "message": "Login password changed successfully."}
    finally:
        cursor.close()
        conn.close()

# ─── Update Customer Profile (editable fields only) ───────────────────────────

@app.patch("/api/profile/{customer_id}")
def update_profile(customer_id: int, request: UpdateProfileRequest):
    """Update email, phone, and/or address. PAN/Aadhaar/CIF are immutable once set."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        fields, values = [], []
        if request.email:
            if not re.match(r'^[^@]+@[^@]+\.[^@]+$', request.email):
                raise HTTPException(status_code=400, detail="Invalid email format.")
            fields.append("email = %s")
            values.append(request.email)
        if request.phone:
            if not re.match(r'^[6-9]\d{9}$', request.phone):
                raise HTTPException(status_code=400, detail="Invalid Indian mobile number. Must be 10 digits starting with 6-9.")
            fields.append("phone = %s")
            values.append(request.phone)
        if request.address:
            if len(request.address.strip()) < 10:
                raise HTTPException(status_code=400, detail="Address must be at least 10 characters.")
            fields.append("address = %s")
            values.append(request.address.strip())
        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided for update.")
        values.append(customer_id)
        cursor.execute(f"UPDATE Customers SET {', '.join(fields)} WHERE customer_id = %s", values)
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found.")
        return {"success": True, "message": "Profile updated successfully."}
    except HTTPException:
        raise
    except mysql.connector.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Email or phone already in use by another account.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ─── Daily Balance Snapshots (Group 2 Audit Fix — sparkline data) ────────────

@app.get("/api/snapshots/{account_number}")
def get_snapshots(account_number: str):
    """Return last 30 daily balance snapshots for a balance-trail sparkline."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT s.snapshot_date, s.closing_balance
            FROM DailyBalanceSnapshots s
            JOIN Accounts a ON a.account_id = s.account_id
            WHERE a.account_number = %s
            ORDER BY s.snapshot_date DESC
            LIMIT 30
            """,
            (account_number,)
        )
        rows = cursor.fetchall()
        for r in rows:
            r['snapshot_date'] = r['snapshot_date'].strftime("%Y-%m-%d")
        return {"snapshots": list(reversed(rows))}  # chronological order for charting
    finally:
        cursor.close()
        conn.close()


# ─── Admin: Employees Full Table (Group 2/3 Audit Fix) ───────────────────────

@app.get("/api/admin/employees")
def get_employees():
    """Return full employee records including name, phone, department, hire_date."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT e.employee_id,
                   CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                   e.email, e.phone, e.department, e.hire_date,
                   l.username, l.is_active, l.last_login, l.created_at AS registered_at
            FROM Employees e
            LEFT JOIN Login l ON l.employee_id = e.employee_id
            ORDER BY e.hire_date ASC
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            for f in ['hire_date', 'last_login', 'registered_at']:
                if r.get(f) and hasattr(r[f], 'strftime'):
                    r[f] = r[f].strftime("%Y-%m-%d") if f == 'hire_date' else r[f].strftime("%Y-%m-%dT%H:%M:%S")
        return {"employees": rows}
    finally:
        cursor.close()
        conn.close()


# ─── Admin: Login is_active Toggle (Group 2 Audit Fix) ───────────────────────

@app.put("/api/admin/login/toggle/{login_id}")
def toggle_login_active(login_id: int):
    """Toggle a Login account's is_active flag — disabling prevents future logins."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT login_id, username, is_active FROM Login WHERE login_id = %s", (login_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Login record not found.")
        new_state = not row['is_active']
        cursor.execute("UPDATE Login SET is_active = %s WHERE login_id = %s", (new_state, login_id))
        conn.commit()
        return {"success": True, "username": row['username'], "is_active": new_state,
                "message": f"Account '{row['username']}' {'activated' if new_state else 'deactivated'}."}
    finally:
        cursor.close()
        conn.close()


# ─── Admin: Security Locks with created_at (Group 3 Audit Fix) ───────────────

@app.get("/api/admin/security")
def get_security_locks():
    """Return all accounts with failed attempts or locks, including is_active and created_at."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT login_id, username, role, failed_attempts, locked_until,
                   is_active, created_at
            FROM Login
            WHERE failed_attempts > 0 OR locked_until IS NOT NULL OR is_active = FALSE
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            for f in ['locked_until', 'created_at']:
                if r.get(f) and hasattr(r[f], 'strftime'):
                    r[f] = r[f].strftime("%Y-%m-%dT%H:%M:%S")
        return {"locks": rows}
    finally:
        cursor.close()
        conn.close()


# ─── Fixed Deposits (Genuine Banking Flow) ───────────────────────────────────

class FDOpenRequest(BaseModel):
    account_number: str
    principal_amount: float
    tenure_years: float
    interest_rate: float
    maturity_instruction: str
    nominee_name: Optional[str] = None
    password: str
    mpin: str

class FDInstructionUpdate(BaseModel):
    maturity_instruction: str
    nominee_name: Optional[str] = None

class FDCalcRequest(BaseModel):
    principal: float
    rate_percent: float
    tenure_years: float

@app.post("/api/calculator/fd")
def calculate_fd(request: FDCalcRequest):
    """Calculate FD returns with quarterly compounding."""
    if request.principal <= 0 or request.tenure_years <= 0 or request.rate_percent < 0:
        raise HTTPException(status_code=400, detail="Invalid inputs for calculation.")
    
    r = request.rate_percent / 100
    n = 4 # quarterly
    t = request.tenure_years
    
    maturity_amount = request.principal * math.pow((1 + r/n), n*t)
    interest_earned = maturity_amount - request.principal
    
    return {
        "success": True,
        "principal": request.principal,
        "maturity_amount": round(maturity_amount, 2),
        "interest_earned": round(interest_earned, 2),
        "compounding": "Quarterly"
    }

@app.post("/api/fd/open")
def open_fixed_deposit(request: FDOpenRequest):
    """
    Open an FD. Requires password + MPIN double lock validation.
    Calls sp_withdraw to deduct the principal from savings.
    Inserts a locked row into Fixed_Deposits.
    """
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        if request.principal_amount < 1000:
            raise HTTPException(status_code=400, detail="Minimum FD amount is ₹1,000")
            
        # 1. Double Lock Validation
        cursor.execute(
            """
            SELECT l.password_hash, l.mpin_hash, a.account_id 
            FROM Login l 
            JOIN Accounts a ON l.customer_id = a.customer_id 
            WHERE a.account_number = %s
            """,
            (request.account_number,)
        )
        auth_row = cursor.fetchone()
        
        if not auth_row:
            raise HTTPException(status_code=404, detail="Account not found.")
            
        if not bcrypt.checkpw(request.password.encode('utf-8'), auth_row['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid password.")
            
        if not auth_row['mpin_hash'] or not bcrypt.checkpw(request.mpin.encode('utf-8'), auth_row['mpin_hash'].encode('utf-8')):
            raise HTTPException(status_code=403, detail="Invalid MPIN. Authorization failed.")
            
        account_id = auth_row['account_id']
        
        # 2. Subtract Principal (creates transaction + updates balance)
        # Check balance directly to be safe, sp_withdraw handles overdraft logic, but FD shouldn't use overdraft!
        # FD MUST be cash only, no overdraft allowed.
        cursor.execute("SELECT balance FROM Accounts WHERE account_number = %s", (request.account_number,))
        bal_row = cursor.fetchone()
        if bal_row['balance'] < request.principal_amount:
            raise HTTPException(status_code=400, detail="Insufficient clear balance (Overdraft cannot be used for FDs)")
            
        # Actually, let's just insert a transaction directly since we verified balance.
        # It's cleaner for FD.
        new_balance = bal_row['balance'] - request.principal_amount
        cursor.execute("UPDATE Accounts SET balance = %s WHERE account_id = %s", (new_balance, account_id))
        cursor.execute(
            "INSERT INTO Transactions (account_id, transaction_type, transaction_channel, amount, balance_after, status, description) VALUES (%s, %s, %s, %s, %s, 'Success', %s)",
            (account_id, 'withdrawal', 'System', request.principal_amount, new_balance, f"Opened FD - {request.tenure_years} Years")
        )
        
        # Calculate Maturity metrics
        r = request.interest_rate / 100
        n = 4 
        t = request.tenure_years
        mat_amt = request.principal_amount * math.pow((1 + r/n), n*t)
        
        from datetime import date
        from dateutil.relativedelta import relativedelta
        mat_date = date.today() + relativedelta(months=int(request.tenure_years * 12))
        
        # 3. Create FD Record
        cursor.execute(
            """
            INSERT INTO Fixed_Deposits 
            (account_id, principal_amount, interest_rate, tenure_months, maturity_amount, maturity_date, maturity_instruction, nominee_name, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Active')
            """,
            (account_id, request.principal_amount, request.interest_rate, int(request.tenure_years * 12), round(mat_amt, 2), mat_date, request.maturity_instruction, request.nominee_name)
        )
        
        conn.commit()
        return {"success": True, "message": "Fixed Deposit booked successfully."}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/api/fd/{account_number}")
def get_fds(account_number: str):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT f.*, a.account_number 
            FROM Fixed_Deposits f
            JOIN Accounts a ON f.account_id = a.account_id
            WHERE a.account_number = %s
            ORDER BY f.created_at DESC
            """, 
            (account_number,)
        )
        rows = cursor.fetchall()
        
        from datetime import date
        today = date.today()
        
        # Enhance rows with accrued interest
        for r in rows:
            if r['status'] == 'Active':
                start = r['created_at'].date() if hasattr(r['created_at'], 'date') else r['created_at']
                days_held = (today - start).days
                if days_held < 0: days_held = 0
                
                # Simple linear interpolation for live view (real banking does daily accrual logic)
                years_held = days_held / 365.0
                rate = r['interest_rate'] / 100
                accrued = r['principal_amount'] * math.pow(1 + rate/4, 4 * years_held) - r['principal_amount']
                r['accrued_interest'] = round(accrued, 2)
                r['current_value'] = r['principal_amount'] + round(accrued, 2)
            else:
                r['accrued_interest'] = 0
                r['current_value'] = 0
                
            if hasattr(r['created_at'], 'strftime'): r['created_at'] = r['created_at'].strftime("%Y-%m-%d")
            if hasattr(r['maturity_date'], 'strftime'): r['maturity_date'] = r['maturity_date'].strftime("%Y-%m-%d")
            
        return {"fds": rows}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/fd/instructions/{fd_id}")
def update_fd_instructions(fd_id: int, request: FDInstructionUpdate):
    """Allows managing the nominee or payout instructions of an active FD."""
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE Fixed_Deposits SET maturity_instruction = %s, nominee_name = %s WHERE fd_id = %s AND status = 'Active'",
            (request.maturity_instruction, request.nominee_name, fd_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Active Fast Deposit not found.")
        conn.commit()
        return {"success": True, "message": "Instructions updated."}
    finally:
        cursor.close()
        conn.close()


@app.post("/api/fd/liquidate/{fd_id}")
def liquidate_fd(fd_id: int):
    """
    Break an FD prematurely.
    Calculates penalty (1% less than booked rate), deposits to Savings, marks FD as Closed.
    """
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="DB Error")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM Fixed_Deposits WHERE fd_id = %s", (fd_id,))
        fd = cursor.fetchone()
        
        if not fd:
            raise HTTPException(status_code=404, detail="FD not found.")
        if fd['status'] != 'Active':
            raise HTTPException(status_code=400, detail="FD is already liquidated or closed.")
            
        from datetime import date
        today = date.today()
        start = fd['created_at'].date() if hasattr(fd['created_at'], 'date') else fd['created_at']
        days_held = (today - start).days
        
        # If liquidated within 7 days, 0 interest (real rule). Otherwise, 1% penalty.
        principal = fd['principal_amount']
        if days_held < 7:
            payout = principal
            interest = 0
            penalty_applied = True
        else:
            years_held = days_held / 365.0
            # 1% penalty
            penal_rate = max(0, fd['interest_rate'] - 1.0) / 100
            payout = principal * math.pow(1 + penal_rate/4, 4 * years_held)
            interest = payout - principal
            penalty_applied = True
            
        # Refund to savings account
        cursor.execute("SELECT balance FROM Accounts WHERE account_id = %s FOR UPDATE", (fd['account_id'],))
        acc = cursor.fetchone()
        new_balance = acc['balance'] + payout
        
        cursor.execute("UPDATE Accounts SET balance = %s WHERE account_id = %s", (new_balance, fd['account_id']))
        desc = f"FD Liquidation (Penalty applied). Interest: ₹{round(interest, 2)}"
        cursor.execute(
            "INSERT INTO Transactions (account_id, transaction_type, transaction_channel, amount, balance_after, status, description) VALUES (%s, %s, %s, %s, %s, 'Success', %s)",
            (fd['account_id'], 'deposit', 'System', round(payout, 2), new_balance, desc)
        )
        
        cursor.execute("UPDATE Fixed_Deposits SET status = 'Closed' WHERE fd_id = %s", (fd_id,))
        
        conn.commit()
        return {
            "success": True, 
            "payout": round(payout, 2), 
            "principal": float(principal),
            "interest": round(interest, 2),
            "penalty_applied": penalty_applied,
            "message": "FD Liquidated successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
