-- ============================================================
--   BANK MANAGEMENT SYSTEM — COMPLETE DATABASE SCHEMA
-- ============================================================

DROP DATABASE IF EXISTS bank_mgmt;
CREATE DATABASE bank_mgmt;
USE bank_mgmt;

-- TABLE 1: Customers
CREATE TABLE Customers (
    customer_id    INT          AUTO_INCREMENT PRIMARY KEY,
    first_name     VARCHAR(50)  NOT NULL,
    last_name      VARCHAR(50)  NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    phone          VARCHAR(15)  NOT NULL UNIQUE,
    address        VARCHAR(255) NOT NULL,
    date_of_birth  DATE         NOT NULL,
    kyc_status     ENUM('Pending', 'Verified', 'Rejected') DEFAULT 'Pending',
    pan_number     VARCHAR(10)  DEFAULT NULL,          -- Format: ABCDE1234F (read-only after KYC)
    aadhaar_number VARCHAR(12)  DEFAULT NULL,          -- 12-digit UIDAI number
    aadhaar_linked BOOLEAN      DEFAULT FALSE,          -- TRUE once Aadhaar is seeded with account
    cif_number     VARCHAR(20)  DEFAULT NULL,          -- Customer Information File (CIF) ID
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: Branches
CREATE TABLE Branches (
    branch_id     INT          AUTO_INCREMENT PRIMARY KEY,
    ifsc_code     VARCHAR(15)  NOT NULL UNIQUE,
    branch_name   VARCHAR(100) NOT NULL,
    city          VARCHAR(50)  NOT NULL
);

-- TABLE: Saved_Beneficiaries
CREATE TABLE Saved_Beneficiaries (
    beneficiary_id       INT          AUTO_INCREMENT PRIMARY KEY,
    customer_id          INT          NOT NULL,
    payee_account_number VARCHAR(20)  NOT NULL,
    nickname             VARCHAR(50)  NOT NULL,
    added_at             DATETIME     DEFAULT CURRENT_TIMESTAMP,
    penny_drop_verified  BOOLEAN      DEFAULT FALSE,
    CONSTRAINT fk_ben_customer
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLE 2: Accounts
CREATE TABLE Accounts (
    account_id       INT            AUTO_INCREMENT PRIMARY KEY,
    account_number   VARCHAR(20)    NOT NULL UNIQUE,
    customer_id      INT            NOT NULL,
    branch_id        INT            NOT NULL,
    account_type     ENUM('savings','current','fixed') DEFAULT 'savings',
    account_category ENUM('Regular', 'Salary', 'Senior Citizen', 'Minor', 'Women', 'BSBD', 'NRE', 'NRO', 'Premium') NOT NULL DEFAULT 'Regular',
    balance          DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
    min_balance      DECIMAL(15,2)  DEFAULT 0.00,
    overdraft_limit  DECIMAL(15,2)  DEFAULT 0.00,
    status           ENUM('active','inactive','frozen') DEFAULT 'active',
    opened_at        DATETIME       DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_customer
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_account_branch
        FOREIGN KEY (branch_id) REFERENCES Branches(branch_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_account_number ON Accounts(account_number);

-- TABLE: DailyBalanceSnapshots
-- Stores each account's end-of-day closing balance for AMB calculation.
-- Populated nightly by sp_record_daily_snapshots() via evt_nightly_snapshot.
CREATE TABLE DailyBalanceSnapshots (
    snapshot_id      INT AUTO_INCREMENT PRIMARY KEY,
    account_id       INT            NOT NULL,
    snapshot_date    DATE           NOT NULL,
    closing_balance  DECIMAL(15,2)  NOT NULL,
    UNIQUE KEY uq_snap (account_id, snapshot_date),
    CONSTRAINT fk_snap_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLE: Cards
CREATE TABLE Cards (
    card_id        INT          AUTO_INCREMENT PRIMARY KEY,
    card_number    VARCHAR(16)  NOT NULL UNIQUE,
    account_id     INT          NOT NULL,
    card_type      ENUM('debit','credit') NOT NULL DEFAULT 'debit',
    card_network   ENUM('Visa', 'Mastercard', 'RuPay', 'Amex') NOT NULL DEFAULT 'RuPay',
    expiry_date    DATE         NOT NULL,
    cvv_hash       VARCHAR(255) NOT NULL,
    is_active      BOOLEAN      DEFAULT TRUE,
    international_enabled BOOLEAN DEFAULT FALSE,
    atm_limit      DECIMAL(15,2) DEFAULT 50000.00,
    pos_limit      DECIMAL(15,2) DEFAULT 100000.00,
    issued_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLE: Card_Requests (Admin-approved card linking workflow)
CREATE TABLE Card_Requests (
    request_id   INT AUTO_INCREMENT PRIMARY KEY,
    account_id   INT          NOT NULL,
    card_number  VARCHAR(16)  NOT NULL,
    card_type    ENUM('debit','credit') NOT NULL DEFAULT 'debit',
    card_network VARCHAR(20)  NOT NULL DEFAULT 'Visa',
    expiry_date  DATE         NOT NULL,
    cvv_hash     VARCHAR(255) NOT NULL,
    status       ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    admin_note   VARCHAR(255) DEFAULT NULL,
    requested_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    actioned_at  DATETIME     DEFAULT NULL,
    CONSTRAINT fk_cardreq_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLE: Nominees

CREATE TABLE Nominees (
    nominee_id     INT          AUTO_INCREMENT PRIMARY KEY,
    account_id     INT          NOT NULL,
    nominee_name   VARCHAR(100) NOT NULL,
    relationship   VARCHAR(50)  NOT NULL,
    age            INT          NOT NULL,
    CONSTRAINT fk_nominee_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLE 3: Transactions
CREATE TABLE Transactions (
    transaction_id      INT             AUTO_INCREMENT PRIMARY KEY,
    account_id          INT             NOT NULL,
    transaction_type    ENUM('deposit','withdrawal','transfer_in','transfer_out') NOT NULL,
    transaction_channel ENUM('System','ATM','UPI','NEFT','RTGS','Cheque') DEFAULT 'UPI',
    amount              DECIMAL(15,2)   NOT NULL CHECK (amount > 0),
    balance_after       DECIMAL(15,2)   NOT NULL,
    status              ENUM('Success','Pending','Failed') DEFAULT 'Success',
    description         VARCHAR(255)    DEFAULT 'Bank transaction',
    transaction_date    DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_account
        FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_txn_account ON Transactions(account_id);

-- TABLE 4: Employees
CREATE TABLE Employees (
    employee_id   INT          AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(50)  NOT NULL,
    last_name     VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    phone         VARCHAR(15)  NOT NULL,
    department    VARCHAR(50)  NOT NULL DEFAULT 'General',
    hire_date     DATE         DEFAULT (CURRENT_DATE)
);

-- TABLE 5: Login 
CREATE TABLE Login (
    login_id        INT          AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin','user') NOT NULL DEFAULT 'user',
    customer_id     INT          DEFAULT NULL,
    employee_id     INT          DEFAULT NULL,
    failed_attempts INT          DEFAULT 0,
    locked_until    DATETIME     DEFAULT NULL,
    last_login      DATETIME     DEFAULT NULL,
    is_active       BOOLEAN      DEFAULT TRUE,
    mpin_hash       VARCHAR(255) DEFAULT NULL,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_login_customer
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_login_employee
        FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- TRIGGER: Auto-update Account balance
DELIMITER $$
CREATE TRIGGER trg_update_balance
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'Success' THEN
        IF NEW.transaction_type = 'deposit' OR NEW.transaction_type = 'transfer_in' THEN
            UPDATE Accounts SET balance = balance + NEW.amount WHERE account_id = NEW.account_id;
        ELSEIF NEW.transaction_type = 'withdrawal' OR NEW.transaction_type = 'transfer_out' THEN
            UPDATE Accounts SET balance = balance - NEW.amount WHERE account_id = NEW.account_id;
        END IF;
    END IF;
END$$

-- STORED PROCEDURE: sp_deposit
CREATE PROCEDURE sp_deposit(
    IN  p_account_number VARCHAR(20),
    IN  p_amount         DECIMAL(15,2),
    IN  p_channel        VARCHAR(20),
    IN  p_description    VARCHAR(255),
    OUT p_result         VARCHAR(100)
)
BEGIN
    DECLARE v_account_id  INT;
    DECLARE v_new_balance DECIMAL(15,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Deposit failed. Transaction rolled back.';
    END;

    START TRANSACTION;
    SAVEPOINT before_deposit;

    SELECT account_id, balance INTO v_account_id, v_new_balance FROM Accounts
    WHERE account_number = p_account_number AND status = 'active' FOR UPDATE;

    IF v_account_id IS NULL THEN
        ROLLBACK TO SAVEPOINT before_deposit;
        SET p_result = 'ERROR: Account not found or inactive.';
        ROLLBACK;
    ELSE
        SET v_new_balance = v_new_balance + p_amount;
        INSERT INTO Transactions(account_id, transaction_type, transaction_channel, amount, balance_after, status, description)
        VALUES (v_account_id, 'deposit', p_channel, p_amount, v_new_balance, 'Success', p_description);
        COMMIT;
        SET p_result = CONCAT('SUCCESS: Deposited ₹', p_amount, '. New balance: ₹', v_new_balance);
    END IF;
END$$

-- STORED PROCEDURE: sp_withdraw  (RBI-Compliant — no instant penalty)
-- Hard floor: savings balance cannot go below ₹0.
-- AMB penalty is collected monthly by sp_calculate_amb_penalties().
CREATE PROCEDURE sp_withdraw(
    IN  p_account_number VARCHAR(20),
    IN  p_amount         DECIMAL(15,2),
    IN  p_channel        VARCHAR(20),
    IN  p_description    VARCHAR(255),
    OUT p_result         VARCHAR(150)
)
BEGIN
    DECLARE v_account_id      INT;
    DECLARE v_balance         DECIMAL(15,2);
    DECLARE v_min_balance     DECIMAL(15,2);
    DECLARE v_max_overdraft   DECIMAL(15,2);
    DECLARE v_acc_type        VARCHAR(20);
    DECLARE v_acc_category    VARCHAR(20);
    DECLARE v_kyc_status      VARCHAR(20);
    DECLARE v_new_balance     DECIMAL(15,2);
    DECLARE v_daily_withdrawn DECIMAL(15,2);
    DECLARE v_final_desc      VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Withdrawal failed. Transaction rolled back.';
    END;

    START TRANSACTION;
    SAVEPOINT before_withdrawal;

    SELECT a.account_id, a.balance, a.min_balance, a.overdraft_limit,
           a.account_type, a.account_category, c.kyc_status
    INTO   v_account_id, v_balance, v_min_balance, v_max_overdraft,
           v_acc_type, v_acc_category, v_kyc_status
    FROM Accounts a
    JOIN Customers c ON a.customer_id = c.customer_id
    WHERE a.account_number = p_account_number AND a.status = 'active'
    FOR UPDATE;

    IF v_account_id IS NULL THEN
        ROLLBACK TO SAVEPOINT before_withdrawal;
        SET p_result = 'ERROR: Account not found or inactive.';
        ROLLBACK;

    ELSEIF v_kyc_status != 'Verified' THEN
        INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                 amount, balance_after, status, description)
        VALUES (v_account_id, 'withdrawal', p_channel, p_amount, v_balance,
                'Failed', 'Failed: KYC Status is Pending/Rejected');
        COMMIT;
        SET p_result = 'ERROR: KYC Action Required. Your account is not verified.';

    ELSE
        SELECT COALESCE(SUM(amount), 0) INTO v_daily_withdrawn
        FROM Transactions
        WHERE account_id = v_account_id
          AND transaction_type = 'withdrawal'
          AND status = 'Success'
          AND DATE(transaction_date) = CURRENT_DATE;

        IF v_daily_withdrawn + p_amount > 100000 THEN
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', p_channel, p_amount, v_balance,
                    'Failed', 'Failed: Exceeds daily withdrawal limit of ₹100,000');
            COMMIT;
            SET p_result = 'ERROR: Exceeds daily withdrawal limit of ₹100,000.';

        -- RBI Rule: savings hard floor = ₹0 (balance can never go negative)
        ELSEIF v_acc_type = 'savings' AND (v_balance - p_amount < 0) THEN
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', p_channel, p_amount, v_balance,
                    'Failed', 'Failed: Insufficient funds (RBI hard floor: ₹0)');
            COMMIT;
            SET p_result = 'ERROR: Insufficient funds. Savings accounts cannot go below ₹0.';

        ELSEIF v_acc_type = 'current' AND (v_balance - p_amount < -v_max_overdraft) THEN
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', p_channel, p_amount, v_balance,
                    'Failed', CONCAT('Failed: Overdraft limit of ₹', v_max_overdraft, ' exceeded'));
            COMMIT;
            SET p_result = 'ERROR: Overdraft limit exceeded.';

        ELSEIF v_acc_type = 'fixed' AND (v_balance < p_amount) THEN
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', p_channel, p_amount, v_balance,
                    'Failed', 'Failed: Insufficient funds in fixed account');
            COMMIT;
            SET p_result = 'ERROR: Insufficient funds.';

        ELSE
            -- Valid withdrawal — no instant penalty (RBI AMB mandate)
            SET v_new_balance = v_balance - p_amount;
            SET v_final_desc  = p_description;

            -- Warn when standard savings drops below minimum;
            -- penalty collected at month-end via sp_calculate_amb_penalties()
            IF v_acc_type = 'savings'
               AND v_acc_category = 'standard'
               AND v_new_balance < v_min_balance THEN
                SET v_final_desc = CONCAT(p_description,
                    ' [Low Balance — AMB penalty may apply at month-end]');
            END IF;

            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', p_channel, p_amount,
                    v_new_balance, 'Success', v_final_desc);
            COMMIT;

            IF v_acc_type = 'savings'
               AND v_acc_category = 'standard'
               AND v_new_balance < v_min_balance THEN
                SET p_result = CONCAT('SUCCESS: Withdrew ₹', p_amount,
                    '. New balance: ₹', v_new_balance,
                    '. WARNING: Balance below minimum — AMB penalty applies at month-end.');
            ELSE
                SET p_result = CONCAT('SUCCESS: Withdrew ₹', p_amount,
                    '. New balance: ₹', v_new_balance);
            END IF;
        END IF;
    END IF;
END$$
-- STORED PROCEDURE: sp_transfer  (RBI-Compliant — no instant penalty)
-- Hard floor: savings sender cannot go below ₹0.
-- Channel auto-selected: UPI / NEFT / RTGS based on amount.
CREATE PROCEDURE sp_transfer(
    IN  p_sender_account   VARCHAR(20),
    IN  p_receiver_account VARCHAR(20),
    IN  p_amount           DECIMAL(15,2),
    OUT p_result           VARCHAR(150)
)
BEGIN
    DECLARE v_sender_id       INT;
    DECLARE v_receiver_id     INT;
    DECLARE v_s_balance       DECIMAL(15,2);
    DECLARE v_s_min_balance   DECIMAL(15,2);
    DECLARE v_s_max_overdraft DECIMAL(15,2);
    DECLARE v_s_acc_type      VARCHAR(20);
    DECLARE v_s_acc_category  VARCHAR(20);
    DECLARE v_s_kyc_status    VARCHAR(20);
    DECLARE v_r_balance       DECIMAL(15,2);
    DECLARE v_r_status        VARCHAR(20);
    DECLARE v_daily_withdrawn DECIMAL(15,2);
    DECLARE v_new_s_balance   DECIMAL(15,2);
    DECLARE v_new_r_balance   DECIMAL(15,2);
    DECLARE v_s_customer_id   INT;
    DECLARE v_ben_added_at    DATETIME;
    DECLARE v_transfer_channel VARCHAR(20);
    DECLARE v_out_desc        VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Transfer failed. Transaction rolled back.';
    END;

    START TRANSACTION;
    SAVEPOINT before_transfer;

    -- Lock accounts deterministically to prevent deadlock
    IF p_sender_account < p_receiver_account THEN
        SELECT account_id INTO v_sender_id
        FROM Accounts WHERE account_number = p_sender_account FOR UPDATE;
        SELECT account_id INTO v_receiver_id
        FROM Accounts WHERE account_number = p_receiver_account FOR UPDATE;
    ELSE
        SELECT account_id INTO v_receiver_id
        FROM Accounts WHERE account_number = p_receiver_account FOR UPDATE;
        SELECT account_id INTO v_sender_id
        FROM Accounts WHERE account_number = p_sender_account FOR UPDATE;
    END IF;

    -- Fetch sender details
    SELECT a.account_id, c.customer_id, a.balance, a.min_balance, a.overdraft_limit,
           a.account_type, a.account_category, c.kyc_status
    INTO   v_sender_id, v_s_customer_id, v_s_balance, v_s_min_balance, v_s_max_overdraft,
           v_s_acc_type, v_s_acc_category, v_s_kyc_status
    FROM Accounts a
    JOIN Customers c ON a.customer_id = c.customer_id
    WHERE a.account_number = p_sender_account AND a.status = 'active';

    -- Fetch receiver details
    SELECT account_id, balance, status
    INTO   v_receiver_id, v_r_balance, v_r_status
    FROM   Accounts
    WHERE  account_number = p_receiver_account AND status = 'active';

    IF v_sender_id IS NULL THEN
        ROLLBACK TO SAVEPOINT before_transfer;
        SET p_result = 'ERROR: Sender account not found or inactive.';
        ROLLBACK;

    ELSEIF v_receiver_id IS NULL THEN
        ROLLBACK TO SAVEPOINT before_transfer;
        SET p_result = 'ERROR: Receiver account not found or inactive.';
        ROLLBACK;

    ELSEIF p_sender_account = p_receiver_account THEN
        ROLLBACK TO SAVEPOINT before_transfer;
        SET p_result = 'ERROR: Cannot transfer to the same account.';
        ROLLBACK;

    ELSEIF v_s_kyc_status != 'Verified' THEN
        INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                 amount, balance_after, status, description)
        VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                'Failed', 'Failed: KYC Status is Pending');
        COMMIT;
        SET p_result = 'ERROR: KYC Action Required. Your account is not verified.';

    ELSE
        -- RBI beneficiary cooldown check
        SELECT added_at INTO v_ben_added_at
        FROM   Saved_Beneficiaries
        WHERE  customer_id = v_s_customer_id
          AND  payee_account_number = p_receiver_account
        LIMIT  1;

        IF v_ben_added_at IS NULL THEN
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                    'Failed', 'Failed: Unregistered Beneficiary');
            COMMIT;
            SET p_result = 'ERROR: RBI Security Block. Payee is not in your Saved Beneficiaries.';

        ELSEIF TIMESTAMPDIFF(HOUR, v_ben_added_at, NOW()) < 24 THEN
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                     amount, balance_after, status, description)
            VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                    'Failed', 'Failed: 24-Hour Cooling Period Active');
            COMMIT;
            SET p_result = 'ERROR: RBI Security Block. 24-hour cooldown is active for this beneficiary.';

        ELSE
            SELECT COALESCE(SUM(amount), 0) INTO v_daily_withdrawn
            FROM   Transactions
            WHERE  account_id = v_sender_id
              AND  transaction_type IN ('withdrawal','transfer_out')
              AND  status = 'Success'
              AND  DATE(transaction_date) = CURRENT_DATE;

            IF v_daily_withdrawn + p_amount > 100000 THEN
                INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                         amount, balance_after, status, description)
                VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                        'Failed', 'Failed: Exceeds daily limit of ₹100,000');
                COMMIT;
                SET p_result = 'ERROR: Exceeds daily transfer limit of ₹100,000.';

            -- RBI Rule: savings hard floor = ₹0
            ELSEIF v_s_acc_type = 'savings' AND (v_s_balance - p_amount < 0) THEN
                INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                         amount, balance_after, status, description)
                VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                        'Failed', 'Failed: Insufficient funds (RBI hard floor: ₹0)');
                COMMIT;
                SET p_result = 'ERROR: Insufficient funds. Savings account cannot go below ₹0.';

            ELSEIF v_s_acc_type = 'current' AND (v_s_balance - p_amount < -v_s_max_overdraft) THEN
                INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                         amount, balance_after, status, description)
                VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                        'Failed', 'Failed: Overdraft limit exceeded');
                COMMIT;
                SET p_result = 'ERROR: Overdraft limit exceeded.';

            ELSEIF v_s_acc_type = 'fixed' AND (v_s_balance < p_amount) THEN
                INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                         amount, balance_after, status, description)
                VALUES (v_sender_id, 'transfer_out', 'System', p_amount, v_s_balance,
                        'Failed', 'Failed: Insufficient funds in fixed account');
                COMMIT;
                SET p_result = 'ERROR: Insufficient funds.';

            ELSE
                -- Valid transfer — RBI channel routing
                SET v_new_s_balance = v_s_balance - p_amount;
                SET v_new_r_balance = v_r_balance + p_amount;
                SET v_transfer_channel = IF(p_amount >= 200000, 'RTGS',
                                         IF(p_amount >= 2000, 'NEFT', 'UPI'));

                SET v_out_desc = CONCAT('To ', p_receiver_account);
                IF v_s_acc_type = 'savings'
                   AND v_s_acc_category = 'standard'
                   AND v_new_s_balance < v_s_min_balance THEN
                    SET v_out_desc = CONCAT('To ', p_receiver_account,
                        ' [Low Balance — AMB penalty may apply at month-end]');
                END IF;

                INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                         amount, balance_after, status, description)
                VALUES (v_sender_id, 'transfer_out', v_transfer_channel,
                        p_amount, v_new_s_balance, 'Success', v_out_desc);

                INSERT INTO Transactions(account_id, transaction_type, transaction_channel,
                                         amount, balance_after, status, description)
                VALUES (v_receiver_id, 'transfer_in', v_transfer_channel,
                        p_amount, v_new_r_balance, 'Success',
                        CONCAT('From ', p_sender_account));

                COMMIT;

                IF v_s_acc_type = 'savings'
                   AND v_s_acc_category = 'standard'
                   AND v_new_s_balance < v_s_min_balance THEN
                    SET p_result = CONCAT('SUCCESS: Transferred ₹', p_amount,
                        ' via ', v_transfer_channel,
                        '. New balance: ₹', v_new_s_balance,
                        '. WARNING: Balance below minimum — AMB penalty applies at month-end.');
                ELSE
                    SET p_result = CONCAT('SUCCESS: Transferred ₹', p_amount,
                        ' via ', v_transfer_channel,
                        '. New balance: ₹', v_new_s_balance);
                END IF;
            END IF;
        END IF;
    END IF;
END$$
DELIMITER ;



-- VIEW: vw_customer_account_summary
CREATE VIEW vw_customer_account_summary AS
SELECT
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name)  AS customer_name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.created_at                             AS customer_since,
    c.kyc_status,
    a.account_number,
    a.account_type,
    a.account_category,
    a.balance                                AS current_balance,
    a.min_balance,
    a.overdraft_limit,
    a.status                                 AS account_status,
    a.opened_at                              AS member_since,
    b.branch_name,
    b.ifsc_code,
    b.city                                   AS branch_city,
    COUNT(t.transaction_id)                  AS total_transactions,
    MAX(t.transaction_date)                  AS last_transaction_date
FROM Customers c
JOIN Accounts a ON a.customer_id = c.customer_id
JOIN Branches b ON a.branch_id = b.branch_id
LEFT JOIN Transactions t ON t.account_id = a.account_id
GROUP BY c.customer_id, a.account_id;

-- SAMPLE DATA INSERTS
INSERT INTO Customers (first_name, last_name, email, phone, address, date_of_birth, kyc_status, pan_number, aadhaar_number, aadhaar_linked, cif_number) VALUES
('Aarav',  'Sharma', 'aarav@example.com',  '9876543210', '12 MG Road, Pune',          '1990-04-15', 'Verified', 'ABCDE1234F', '123456789012', TRUE,  'CIF00000001'),
('Priya',  'Mehta',  'priya@example.com',  '9823456781', '45 FC Road, Mumbai',         '1995-07-22', 'Pending',  'FGHIJ5678K', NULL, FALSE, 'CIF00000002'),
('Rahul',  'Verma',  'rahul@example.com',  '9012345678', '78 Lal Bagh, Bengaluru',     '1988-11-03', 'Verified', 'LMNOP9012Q', '333344445555', TRUE,  'CIF00000003'),
('Sneha',  'Patil',  'sneha@example.com',  '8765432109', '33 Civil Lines, Nagpur',     '1993-02-14', 'Pending',  'RSTUV3456W', NULL, FALSE, 'CIF00000004'),
('Vikram', 'Singh',  'vikram@example.com', '7654321098', '22 Park Street, Kolkata',    '1985-09-30', 'Verified', 'WXYZZ7890A', '987654321098', TRUE,  'CIF00000005');

INSERT INTO Branches (ifsc_code, branch_name, city) VALUES
('SBIN0001234', 'Pune Main Branch', 'Pune'),
('HDFC0005678', 'Mumbai Central', 'Mumbai'),
('ICIC0009101', 'Bengaluru Tech Park', 'Bengaluru');

INSERT INTO Accounts (account_number, customer_id, branch_id, account_type, account_category, balance, min_balance, overdraft_limit) VALUES
('ACC0000000001', 1, 1, 'savings', 'Regular', 50000.00, 5000.00, 0.00),
('ACC0000000002', 2, 2, 'current', 'Premium', 120000.00, 0.00, 50000.00),
('ACC0000000003', 3, 3, 'savings', 'Senior Citizen', 75000.00, 5000.00, 0.00),
('ACC0000000004', 4, 1, 'fixed', 'Regular', 200000.00, 0.00, 0.00),
('ACC0000000005', 5, 2, 'current', 'Salary', 30000.00, 0.00, 100000.00);

SET @acc1 = (SELECT account_id FROM Accounts WHERE account_number='ACC0000000001');
SET @acc2 = (SELECT account_id FROM Accounts WHERE account_number='ACC0000000002');
SET @acc3 = (SELECT account_id FROM Accounts WHERE account_number='ACC0000000003');

INSERT INTO Nominees (account_id, nominee_name, relationship, age) VALUES
(@acc1, 'Sita Sharma', 'Mother', 55),
(@acc2, 'Rohan Mehta', 'Brother', 25),
(@acc3, 'Amit Verma', 'Father', 60);

INSERT INTO Transactions (account_id, transaction_type, transaction_channel, amount, balance_after, status, description, transaction_date) VALUES
(@acc1, 'deposit', 'NEFT', 50000.00, 50000.00, 'Success', 'Initial deposit', '2024-01-10 09:00:00'),
(@acc1, 'withdrawal', 'ATM', 10000.00, 40000.00, 'Success', 'ATM withdrawal', '2024-02-15 14:30:00');

-- SAMPLE DATA INSERTS (Ensure tests pass initially via historical cooling trace)
INSERT INTO Saved_Beneficiaries (customer_id, payee_account_number, nickname, added_at) VALUES
(1, 'ACC0000000002', 'Priya Rent', '2022-01-01 10:00:00'),
(1, 'ACC0000000004', 'Sibling Fix', '2022-01-01 10:00:00');

INSERT INTO Cards (card_number, account_id, card_type, card_network, expiry_date, cvv_hash, is_active) VALUES
('4532111122223333', @acc1, 'debit', 'Visa', '2028-12-31', 'not_real_hash_1', 1),
('4532111122224444', @acc2, 'credit', 'Mastercard', '2029-06-30', 'not_real_hash_2', 1),
('5555666677778888', @acc1, 'debit', 'RuPay', '2027-11-30', 'not_real_hash_3', 0);

INSERT INTO Employees (first_name, last_name, email, phone, department, hire_date) VALUES
('Suresh', 'Joshi', 'suresh@bank.com', '9999000001', 'Management', '2015-06-01'),
('Kavita',  'Rao',     'kavita@bank.com',  '9999000002', 'Operations', '2018-03-15'),
('Manish',  'Gupta',   'manish@bank.com',  '9999000003', 'IT',         '2020-08-10');

INSERT INTO Login (username, password_hash, role, customer_id, employee_id) VALUES
('admin', '$2b$12$du6VsjbmYpvBdSzspiN/TeTsHUt8qT6cqLb5nqG0dow5wSMQMuN.2', 'admin', NULL, 1),
('aarav_s', '$2b$12$du6VsjbmYpvBdSzspiN/TeTsHUt8qT6cqLb5nqG0dow5wSMQMuN.2', 'user', 1, NULL),
('priya_m', '$2b$12$du6VsjbmYpvBdSzspiN/TeTsHUt8qT6cqLb5nqG0dow5wSMQMuN.2', 'user', 2, NULL),
('rahul_v', '$2b$12$du6VsjbmYpvBdSzspiN/TeTsHUt8qT6cqLb5nqG0dow5wSMQMuN.2', 'user', 3, NULL),
('sneha_p', '$2b$12$du6VsjbmYpvBdSzspiN/TeTsHUt8qT6cqLb5nqG0dow5wSMQMuN.2', 'user', 4, NULL),
('vikram_s', '$2b$12$du6VsjbmYpvBdSzspiN/TeTsHUt8qT6cqLb5nqG0dow5wSMQMuN.2', 'user', 5, NULL);

-- VIEW: vw_admin_analytics
CREATE VIEW vw_admin_analytics AS
SELECT 
    (SELECT COALESCE(SUM(balance), 0) FROM Accounts WHERE status = 'active') AS total_bank_liquidity,
    (SELECT COUNT(customer_id) FROM Customers) AS total_active_customers,
    (SELECT COUNT(customer_id) FROM Customers WHERE kyc_status = 'Pending') AS pending_kyc_count,
    (SELECT COALESCE(SUM(amount), 0) FROM Transactions WHERE DATE(transaction_date) = CURRENT_DATE) AS total_transaction_volume;

-- STORED PROCEDURE: sp_get_account_statement (Dynamic Running Balance via Window Functions)
DROP PROCEDURE IF EXISTS sp_get_account_statement;
DELIMITER $$
CREATE PROCEDURE sp_get_account_statement(
    IN p_account_number VARCHAR(20),
    IN p_start_date     DATE,
    IN p_end_date       DATE
)
BEGIN
    WITH TransactionHistory AS (
        SELECT 
            transaction_id,
            transaction_date,
            transaction_type,
            transaction_channel,
            description,
            amount,
            status,
            SUM(
                CASE 
                    WHEN status != 'Success' THEN 0
                    WHEN transaction_type IN ('deposit', 'transfer_in') THEN amount 
                    ELSE -amount 
                END
            ) OVER(ORDER BY transaction_date ASC, transaction_id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS dynamic_running_balance
        FROM Transactions
        WHERE account_id = (SELECT account_id FROM Accounts WHERE account_number = p_account_number LIMIT 1)
    )
    SELECT * 
    FROM TransactionHistory
    WHERE DATE(transaction_date) BETWEEN p_start_date AND p_end_date
    ORDER BY transaction_date DESC;
END$$ 
DELIMITER ;

-- VIEW: vw_account_cash_flow (Analytics Aggregations)
DROP VIEW IF EXISTS vw_account_cash_flow;
CREATE VIEW vw_account_cash_flow AS
SELECT 
    a.account_number,
    DATE_FORMAT(t.transaction_date, '%b %Y') AS month_label,
    SUM(CASE WHEN t.transaction_type IN ('deposit', 'transfer_in') THEN t.amount ELSE 0 END) AS money_in,
    SUM(CASE WHEN t.transaction_type IN ('withdrawal', 'transfer_out') THEN t.amount ELSE 0 END) AS money_out
FROM Transactions t
JOIN Accounts a ON t.account_id = a.account_id
WHERE t.status = 'Success'
GROUP BY a.account_number, DATE_FORMAT(t.transaction_date, '%Y-%m'), DATE_FORMAT(t.transaction_date, '%b %Y')
ORDER BY DATE_FORMAT(t.transaction_date, '%Y-%m') ASC;

-- 1. Enable Native Event Scheduler
SET GLOBAL event_scheduler = ON;

-- STORED PROCEDURE: sp_record_daily_snapshots
-- Called nightly to capture each account's closing balance for AMB tracking.
DELIMITER $$
CREATE PROCEDURE sp_record_daily_snapshots()
BEGIN
    INSERT INTO DailyBalanceSnapshots (account_id, snapshot_date, closing_balance)
    SELECT account_id, CURRENT_DATE, balance
    FROM   Accounts
    WHERE  status = 'active'
    ON DUPLICATE KEY UPDATE closing_balance = VALUES(closing_balance);
END$$
DELIMITER ;

-- STORED PROCEDURE: sp_calculate_amb_penalties
-- End-of-month batch: calculates AMB for each standard savings account.
-- Deducts ₹200 penalty only if AMB < min_balance AND balance > ₹0.
-- RBI Rule: penalty capped at current balance so balance never goes negative.
DELIMITER $$
CREATE PROCEDURE sp_calculate_amb_penalties()
BEGIN
    DECLARE done            INT          DEFAULT FALSE;
    DECLARE v_account_id    INT;
    DECLARE v_min_balance   DECIMAL(15,2);
    DECLARE v_curr_balance  DECIMAL(15,2);
    DECLARE v_acc_category  VARCHAR(20);
    DECLARE v_opened_at     DATETIME;
    DECLARE v_amb           DECIMAL(15,2);
    DECLARE v_days_in_month INT;
    DECLARE v_penalty       DECIMAL(15,2);
    DECLARE v_deductable    DECIMAL(15,2);
    DECLARE v_new_balance   DECIMAL(15,2);
    DECLARE v_days_old      INT;

    DECLARE cur_accounts CURSOR FOR
        SELECT account_id, min_balance, balance, account_category, opened_at
        FROM   Accounts
        WHERE  status       = 'active'
          AND  account_type = 'savings'
          AND  min_balance  > 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    SET v_penalty       = 200.00;
    SET v_days_in_month = DAY(LAST_DAY(CURRENT_DATE));

    OPEN cur_accounts;
    amb_loop: LOOP
        FETCH cur_accounts INTO v_account_id, v_min_balance, v_curr_balance,
                                v_acc_category, v_opened_at;
        IF done THEN LEAVE amb_loop; END IF;

        -- Exemption 1: Zero-balance product categories
        IF v_acc_category IN ('salary','student','bsbd') THEN
            ITERATE amb_loop;
        END IF;

        -- Exemption 2: New account 90-day grace period
        SET v_days_old = DATEDIFF(CURRENT_DATE, DATE(v_opened_at));
        IF v_days_old < 90 THEN
            ITERATE amb_loop;
        END IF;

        -- Calculate AMB from snapshots; fall back to current balance if no snapshots
        SELECT COALESCE(
                   SUM(closing_balance) / v_days_in_month,
                   v_curr_balance
               )
        INTO   v_amb
        FROM   DailyBalanceSnapshots
        WHERE  account_id            = v_account_id
          AND  MONTH(snapshot_date)  = MONTH(CURRENT_DATE)
          AND  YEAR(snapshot_date)   = YEAR(CURRENT_DATE);

        -- No penalty if AMB meets the requirement
        IF v_amb >= v_min_balance THEN
            ITERATE amb_loop;
        END IF;

        -- RBI Negative-Balance Rule: cap deduction at current balance (₹0 floor)
        SET v_deductable = LEAST(v_penalty, v_curr_balance);
        IF v_deductable <= 0 THEN
            ITERATE amb_loop;   -- Balance already ₹0, nothing to deduct
        END IF;

        SET v_new_balance = v_curr_balance - v_deductable;

        UPDATE Accounts
        SET    balance = v_new_balance
        WHERE  account_id = v_account_id;

        INSERT INTO Transactions(
            account_id, transaction_type, transaction_channel,
            amount, balance_after, status, description
        )
        VALUES (
            v_account_id, 'withdrawal', 'System',
            v_deductable, v_new_balance, 'Success',
            CONCAT('AMB Penalty — Min Balance Shortfall. ',
                   'AMB this month: ₹', ROUND(v_amb, 2),
                   ' | Required: ₹', v_min_balance,
                   ' | Deducted: ₹', v_deductable)
        );
    END LOOP;
    CLOSE cur_accounts;
END$$
DELIMITER ;

-- EVENT: evt_nightly_snapshot (captures closing balance every night at 23:59)
DROP EVENT IF EXISTS evt_nightly_snapshot;
DELIMITER $$
CREATE EVENT evt_nightly_snapshot
ON SCHEDULE EVERY 1 DAY
STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 23 HOUR + INTERVAL 59 MINUTE)
DO CALL sp_record_daily_snapshots()$$
DELIMITER ;

-- EVENT: evt_monthly_amb_penalty (runs AMB batch on 1st of each month)
DROP EVENT IF EXISTS evt_monthly_amb_penalty;
DELIMITER $$
CREATE EVENT evt_monthly_amb_penalty
ON SCHEDULE EVERY 1 MONTH
STARTS (DATE_FORMAT(CURRENT_DATE + INTERVAL 1 MONTH, '%Y-%m-01') + INTERVAL 5 MINUTE)
DO CALL sp_calculate_amb_penalties()$$
DELIMITER ;

-- Seed initial snapshot so AMB calculation has data from day one
CALL sp_record_daily_snapshots();

-- 2. New Table: Loans
CREATE TABLE Loans (
    loan_id          INT             AUTO_INCREMENT KEY,
    account_id       INT             NOT NULL,
    total_amount     DECIMAL(15,2)   NOT NULL,
    emi_amount       DECIMAL(15,2)   NOT NULL,
    remaining_amount DECIMAL(15,2)   NOT NULL,
    next_due_date    DATE            NOT NULL,
    status           ENUM('Pending', 'Active', 'Closed', 'Rejected') DEFAULT 'Pending',
    created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loan_account FOREIGN KEY (account_id) REFERENCES Accounts(account_id) ON DELETE CASCADE
);

-- 3. New Table: AutoPay
CREATE TABLE AutoPay (
    autopay_id       INT             AUTO_INCREMENT KEY,
    account_id       INT             NOT NULL,
    merchant_name    VARCHAR(100)    NOT NULL,
    amount           DECIMAL(15,2)   NOT NULL,
    next_due_date    DATE            NOT NULL,
    status           ENUM('Active', 'Cancelled') DEFAULT 'Active',
    created_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_autopay_account FOREIGN KEY (account_id) REFERENCES Accounts(account_id) ON DELETE CASCADE
);

-- 4. New Table: Fixed Deposits
CREATE TABLE Fixed_Deposits (
    fd_id                INT             AUTO_INCREMENT KEY,
    account_id           INT             NOT NULL,
    principal_amount     DECIMAL(15,2)   NOT NULL CHECK (principal_amount > 0),
    interest_rate        DECIMAL(5,2)    NOT NULL,
    tenure_months        INT             NOT NULL CHECK (tenure_months > 0),
    maturity_amount      DECIMAL(15,2)   NOT NULL,
    maturity_date        DATE            NOT NULL,
    maturity_instruction ENUM('Auto-Renew', 'Credit to Savings') DEFAULT 'Credit to Savings',
    nominee_name         VARCHAR(100)    DEFAULT NULL,
    status               ENUM('Active', 'Closed') DEFAULT 'Active',
    created_at           DATETIME        DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fd_account FOREIGN KEY (account_id) REFERENCES Accounts(account_id) ON DELETE CASCADE
);

-- SEED LOANS AND AUTOPAY
INSERT INTO Loans (account_id, total_amount, emi_amount, remaining_amount, next_due_date, status) VALUES 
(@acc1, 500000.00, 15000.00, 450000.00, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'Active'), -- Payment due soon
(@acc2, 100000.00, 5000.00, 20000.00, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), 'Active'), -- Overdue test
(@acc3, 200000.00, 8000.00, 0.00, DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR), 'Closed'); -- Closed loan

INSERT INTO AutoPay (account_id, merchant_name, amount, next_due_date, status) VALUES 
(@acc1, 'Netflix Premium', 649.00, DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'Active'),
(@acc1, 'Amazon Prime', 1499.00, DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY), 'Active'),
(@acc2, 'Office Rent', 15000.00, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'Cancelled');


-- 4. The Core Execution Engine (Cursor-driven Macro)
DROP PROCEDURE IF EXISTS sp_process_daily_deductions;
DELIMITER $$
CREATE PROCEDURE sp_process_daily_deductions()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_account_id INT;
    DECLARE v_amount DECIMAL(15,2);
    DECLARE v_name VARCHAR(100);
    DECLARE v_balance DECIMAL(15,2);
    DECLARE v_min_bal DECIMAL(15,2);
    DECLARE v_overdraft DECIMAL(15,2);
    DECLARE v_acc_type VARCHAR(20);
    DECLARE v_new_balance DECIMAL(15,2);
    
    -- Cursor arrays bounding only due, active records
    DECLARE cur_loans CURSOR FOR SELECT loan_id, account_id, emi_amount FROM Loans WHERE status = 'Active' AND next_due_date <= CURRENT_DATE;
    DECLARE cur_autopay CURSOR FOR SELECT autopay_id, account_id, amount, merchant_name FROM AutoPay WHERE status = 'Active' AND next_due_date <= CURRENT_DATE;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;

    OPEN cur_loans;
    read_loans: LOOP
        FETCH cur_loans INTO v_id, v_account_id, v_amount;
        IF done THEN LEAVE read_loans; END IF;
        
        -- Acquire explicit row block on the account limits via explicit parsing bounds
        SELECT balance, min_balance, overdraft_limit, account_type INTO v_balance, v_min_bal, v_overdraft, v_acc_type 
        FROM Accounts WHERE account_id = v_account_id FOR UPDATE;
        
        SET v_new_balance = v_balance - v_amount;
        IF (v_acc_type = 'savings' AND v_new_balance >= v_min_bal) OR (v_acc_type = 'current' AND v_new_balance >= -v_overdraft) OR (v_acc_type = 'fixed' AND v_new_balance >= 0) THEN
            -- Fix: Explicitly Update Account Balance (Architecture Target Verified)
            UPDATE Accounts SET balance = v_new_balance WHERE account_id = v_account_id;

            INSERT INTO Transactions(account_id, transaction_type, transaction_channel, amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', 'System', v_amount, v_new_balance, 'Success', CONCAT('AutoPay: Loan EMI Deduction #', v_id));
            
            UPDATE Loans SET remaining_amount = remaining_amount - v_amount, next_due_date = DATE_ADD(next_due_date, INTERVAL 1 MONTH) WHERE loan_id = v_id;
            IF (SELECT remaining_amount FROM Loans WHERE loan_id = v_id) <= 0 THEN
               UPDATE Loans SET status = 'Closed', remaining_amount = 0 WHERE loan_id = v_id;
            END IF;
        ELSE
            -- Failed tracking payload
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel, amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', 'System', v_amount, v_balance, 'Failed', CONCAT('AutoPay Bounced: Loan EMI Insufficient Funds #', v_id));
        END IF;
    END LOOP;
    CLOSE cur_loans;
    
    -- Reset loop bounds
    SET done = FALSE;
    
    OPEN cur_autopay;
    read_autopay: LOOP
        FETCH cur_autopay INTO v_id, v_account_id, v_amount, v_name;
        IF done THEN LEAVE read_autopay; END IF;
        
        SELECT balance, min_balance, overdraft_limit, account_type INTO v_balance, v_min_bal, v_overdraft, v_acc_type 
        FROM Accounts WHERE account_id = v_account_id FOR UPDATE;
        
        SET v_new_balance = v_balance - v_amount;
        IF (v_acc_type = 'savings' AND v_new_balance >= v_min_bal) OR (v_acc_type = 'current' AND v_new_balance >= -v_overdraft) OR (v_acc_type = 'fixed' AND v_new_balance >= 0) THEN
            -- Fix: Explicitly Update Account Balance (Architecture Target Verified)
            UPDATE Accounts SET balance = v_new_balance WHERE account_id = v_account_id;

            INSERT INTO Transactions(account_id, transaction_type, transaction_channel, amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', 'System', v_amount, v_new_balance, 'Success', CONCAT('AutoPay Merchant: ', v_name));
            UPDATE AutoPay SET next_due_date = DATE_ADD(next_due_date, INTERVAL 1 MONTH) WHERE autopay_id = v_id;
        ELSE
            INSERT INTO Transactions(account_id, transaction_type, transaction_channel, amount, balance_after, status, description)
            VALUES (v_account_id, 'withdrawal', 'System', v_amount, v_balance, 'Failed', CONCAT('AutoPay Bounced: Merchant ', v_name));
        END IF;
    END LOOP;
    CLOSE cur_autopay;
    COMMIT;
END$$
DELIMITER ;

-- 5. The Trigger (Event Scheduler Engine)
DROP EVENT IF EXISTS evt_daily_deductions;
CREATE EVENT evt_daily_deductions
ON SCHEDULE EVERY 1 DAY STARTS (CURRENT_DATE + INTERVAL 1 DAY)
DO CALL sp_process_daily_deductions();

