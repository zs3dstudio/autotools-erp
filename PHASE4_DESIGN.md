# Phase-4 Financial Control Layer: Design Document

This document outlines the database schema changes, API additions, and UI components required to implement the Phase-4 Financial Control Layer for the AutoTools ERP system.

## 1. Analysis of Existing System

The current system (Phase-2/3) has a solid foundation for inventory, sales, and multi-branch operations. Key observations:

- **Drizzle ORM & tRPC:** The project uses Drizzle for database interaction and tRPC for API endpoints, providing strong type safety.
- **Preview Mode:** A `better-sqlite3`-based preview mode with seed data allows for rapid local development and testing.
- **Component-Based UI:** The frontend is built with React, Vite, and TailwindCSS, using a set of reusable UI components from `shadcn/ui`.
- **Profit Calculation:** The `sale_items` table already calculates `profit`, `investor70`, `master30`, and `cashDueHO` at the point of sale, which is a great starting point.
- **HO Payments:** An `ho_payments` table exists but lacks an approval workflow.

## 2. Database Schema Updates

New tables and modifications are required to support the financial control features. These will be implemented in a new Drizzle migration file (`drizzle/0004_phase4_financial_control.sql`) and reflected in `drizzle/schema.ts`.

### New Tables

**`supplier_ledger`**

Tracks all financial transactions with suppliers, creating a full ledger.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Unique identifier |
| `supplierId` | INT (FK) | Links to `suppliers.id` |
| `transactionType` | ENUM | 'Purchase', 'Payment', 'CreditNote', 'DebitNote' |
| `referenceId` | INT | ID of the related record (e.g., `purchase_finalizations.id`) |
| `debit` | DECIMAL | Amount owed to the supplier (e.g., from a purchase) |
| `credit` | DECIMAL | Amount paid to the supplier |
| `runningBalance` | DECIMAL | The outstanding balance after the transaction |
| `transactionDate` | TIMESTAMP | Date of the transaction |
| `createdAt` | TIMESTAMP | Record creation timestamp |

**`investors`**

Stores information about individuals in the investor pool.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Unique identifier |
| `name` | VARCHAR | Investor's full name |
| `contactInfo` | TEXT | Email, phone, etc. |
| `isActive` | BOOLEAN | Whether the investor is currently active |
| `createdAt` | TIMESTAMP | Record creation timestamp |

**`investor_capital`**

Tracks capital contributions from each investor, which determines their share percentage.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Unique identifier |
| `investorId` | INT (FK) | Links to `investors.id` |
| `amount` | DECIMAL | The amount of capital contributed |
| `contributionDate` | TIMESTAMP | Date of the contribution |
| `notes` | TEXT | Optional notes about the contribution |
| `createdAt` | TIMESTAMP | Record creation timestamp |

**`profit_distributions`**

Logs the periodic distribution of the investor profit pool.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Unique identifier |
| `distributionPeriod` | VARCHAR | e.g., 'YYYY-MM' for monthly distribution |
| `totalInvestorPool` | DECIMAL | Total amount from `sale_items.investor70` for the period |
| `isFinalized` | BOOLEAN | Locks the distribution from further changes |
| `finalizedAt` | TIMESTAMP | When the distribution was finalized |
| `createdAt` | TIMESTAMP | Record creation timestamp |

**`profit_distribution_details`**

Details of how much each investor received in a specific distribution.

| Column | Type | Description |
|---|---|---|
| `id` | INT (PK) | Unique identifier |
| `distributionId` | INT (FK) | Links to `profit_distributions.id` |
| `investorId` | INT (FK) | Links to `investors.id` |
| `capitalSharePercent` | DECIMAL | The investor's capital share % at the time of distribution |
| `distributedAmount` | DECIMAL | The amount distributed to this investor |
| `createdAt` | TIMESTAMP | Record creation timestamp |

### Table Modifications

**`ho_payments`**

Add columns to support the approval workflow.

- `status`: ENUM('Pending', 'Approved', 'Rejected') - Default 'Pending'.
- `approvedByUserId`: INT (FK to `users.id`) - Nullable.
- `rejectionReason`: TEXT - Nullable.
- `approvedAt`: TIMESTAMP - Nullable.

## 3. API (tRPC Router) Additions

A new router will be created at `server/routers/financials.ts` and integrated into `server/routers.ts`.

### `financialsRouter`

- **`supplierLedger.get(supplierId)`**: Retrieves all ledger entries for a supplier.
- **`supplierLedger.recordPayment(supplierId, amount, ...)`**: Creates a 'Payment' entry in `supplier_ledger` and updates the running balance.
- **`supplierLedger.getOutstandingSummary()`**: Returns a list of all suppliers with their outstanding balances.

- **`hoPayments.request(branchId, amount, ...)`**: Creates a new entry in `ho_payments` with `status: 'Pending'`.
- **`hoPayments.listPending()`**: For admins to view all payment requests with `status: 'Pending'`.
- **`hoPayments.approve(paymentId)`**: Admin action. Sets `status: 'Approved'`, records `approvedByUserId`, and creates corresponding ledger entries for the branch and HO.
- **`hoPayments.reject(paymentId, reason)`**: Admin action. Sets `status: 'Rejected'` and records the `rejectionReason`.

- **`investors.list()`**: Retrieves all investors and their total capital contributions.
- **`investors.add(name, contactInfo)`**: Creates a new investor.
- **`investors.addCapital(investorId, amount, ...)`**: Adds a new capital contribution record.

- **`profit.getSummary()`**: Calculates and returns company-wide profit vs. total branch profit.
- **`profit.calculateDistribution(period)`**: Calculates the profit distribution for a given period (e.g., '2026-02') without saving it.
- **`profit.finalizeDistribution(period, distributionData)`**: Saves the calculated distribution to `profit_distributions` and `profit_distribution_details`, marking it as finalized.
- **`profit.getDistributionHistory()`**: Retrieves past finalized distributions.

## 4. UI Additions

New pages will be created in the `client/src/pages/` directory.

- **`FinancialDashboard.tsx`**: A new dashboard for Admins. It will feature:
    - KPI cards for Total Supplier Payables, Pending HO Payments, Investor Pool Size, and Company Profit.
    - A chart showing profit trends over time.
    - A summary table of outstanding supplier balances.

- **`SupplierLedger.tsx`**: A page to view supplier accounts. It will include:
    - A dropdown to select a supplier.
    - A table showing the full transaction history for the selected supplier.
    - A button to open a dialog for recording a new payment to the supplier.

- **`HOPaymentsApproval.tsx`**: An admin-only page to manage branch payment requests.
    - A table listing all `Pending` payments from branches.
    - Approve/Reject buttons for each request.

- **`InvestorManagement.tsx`**: A page for managing the investor pool.
    - A table listing all investors and their capital contributions.
    - A form to add a new investor or a new capital contribution.
    - A section for calculating and finalizing monthly profit distributions.

## 5. Financial Flow Logic

- **Supplier Payables**: When a purchase is finalized in the Phase-2 Purchase Workflow, a `debit` entry will be automatically added to the `supplier_ledger` for the total purchase amount, increasing the supplier's outstanding balance.
- **Branch-HO Payments**: When an admin approves a payment, two ledger entries are created: a `debit` in the branch's ledger (cash sent out) and a `credit` in the head office's main ledger (cash received).
- **Profit Distribution**: The system will sum the `investor70` column from all `sale_items` within a given month to get the total investor pool. This total is then distributed among active investors based on their percentage of the total capital in the `investor_capital` table.
