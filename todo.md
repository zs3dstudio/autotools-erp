# AutoTools ERP & POS System - TODO

## Phase 2: Database Schema
- [x] Branches table
- [x] Products / catalog table with categories and suppliers
- [x] Inventory items table with serial number tracking
- [x] Sales / POS transactions table
- [x] Sale line items table
- [x] Stock transfer requests table
- [x] Financial ledger entries table
- [x] Expense entries table
- [x] Audit trail table
- [x] User-branch assignments table
- [x] Reorder alerts table
- [x] Run migrations

## Phase 3: Backend API (tRPC Routers)
- [x] Auth router (me, logout, user management)
- [x] Branches router (CRUD, admin only)
- [x] Products router (CRUD, categories, suppliers)
- [x] Inventory router (list, add, update status, serial tracking, stock alerts)
- [x] POS router (create sale, fetch item by serial/barcode, payment types)
- [x] Transfers router (create request, approve/reject, receive confirmation)
- [x] Ledger router (entries, branch balance, profit split)
- [x] Reports router (daily/monthly summaries, analytics)
- [x] Audit router (list audit trail)
- [x] Users router (list, assign role, assign branch)

## Phase 4: Global Layout & Theme
- [x] Dark elegant theme (CSS variables, Tailwind tokens)
- [x] DashboardLayout customization with sidebar nav
- [x] Role-based route guards
- [x] Navigation items per role (Admin vs Manager)
- [x] App.tsx routing for all pages

## Phase 5: Dashboards
- [x] Admin dashboard with KPI cards (total sales, profit, inventory value, pending transfers, branch balances)
- [x] Manager dashboard with branch-scoped KPIs (branch sales, available stock, pending transfers, ledger balance)
- [x] Recharts line/bar charts for sales trends
- [x] Real-time stock alert banners

## Phase 6: Inventory, Products & Transfers
- [x] Product catalog page (list, add, edit, categories, suppliers, pricing)
- [x] Inventory page (serial number list, status badges, filters, search)
- [x] Add inventory items (single and bulk)
- [x] Stock transfer request page
- [x] Transfer approval page (Admin)
- [x] Transfer tracking / receive confirmation

## Phase 7: POS Screen
- [x] POS layout (barcode input, product display, cart, payment)
- [x] Barcode/serial number scanner input
- [x] Auto-fetch product details on scan
- [x] Payment type selection (Cash, Card, Transfer)
- [x] Save sale and update inventory status
- [x] Receipt print layout (thermal-style)
- [x] Offline mode with IndexedDB local storage
- [x] Auto-sync when internet returns

## Phase 8: Financial, Reports, Audit & Users
- [x] Financial ledger page (entries per branch, balance summary)
- [x] Profit split display (70% investor pool, 30% master)
- [x] Expense management (add/list expenses)
- [x] Sales reports page (daily/monthly, charts, export)
- [x] Audit trail page (filterable log of all actions)
- [x] User management page (list users, assign roles, assign branches)

## Phase 9: Testing & Finalization (COMPLETED)
- [x] Vitest tests for inventory router
- [x] Vitest tests for POS router
- [x] Vitest tests for transfer workflow
- [x] Vitest tests for ledger calculations
- [x] Final integration check
- [x] Save checkpoint

## PHASE-2 INFRASTRUCTURE (COMPLETED)

### 1. Stock Integrity Engine (COMPLETED)
- [x] Design stock reservation schema (stock_reservations table)
- [x] Add stock reservation functions to db.phase2.ts
- [x] Implement getAvailableStock() function
- [x] Implement checkSufficientStock() function
- [x] Implement createStockReservation() function
- [x] Implement releaseStockReservation() function
- [x] Implement consumeStockReservation() function
- [x] Implement getStockValuationByLocation() function
- [x] Create stock router with all procedures
- [x] Write vitest tests for stock integrity logic (phase2.stock.test.ts)

### 2. Purchase Workflow Pipeline (COMPLETED)
- [x] Design purchase schema (purchase_orders, grn, landing_costs, purchase_finalizations tables)
- [x] Create createPurchaseOrder() procedure
- [x] Create addPurchaseOrderItem() procedure
- [x] Create submitPurchaseOrder() procedure
- [x] Create approvePurchaseOrder() procedure
- [x] Create createGRN() procedure
- [x] Create addGRNItem() procedure
- [x] Create addLandingCost() procedure
- [x] Create receiveGRN() procedure
- [x] Create finalizePurchase() procedure with auto-payable creation
- [x] Add supplier payable tracking to ledger
- [x] Create purchase router with all procedures
- [x] Write vitest tests for purchase workflow (phase2.purchase.test.ts)

### 3. Payment Allocation Engine (COMPLETED)
- [x] Design payment allocation schema (invoices, invoice_payments, payment_allocations, invoice_aging tables)
- [x] Create createInvoice() procedure
- [x] Create issueInvoice() procedure
- [x] Create recordInvoicePayment() procedure
- [x] Create getInvoiceDetails() procedure
- [x] Create updateInvoiceAging() procedure
- [x] Create getSupplierOutstandingInvoices() procedure
- [x] Create getCustomerOutstandingInvoices() procedure
- [x] Create getSupplierOutstandingBalances() procedure
- [x] Create getInvoiceAgingSummary() procedure
- [x] Create payment router with all procedures
- [x] Write vitest tests for payment allocation (phase2.payment.test.ts)

### 4. Operational Reports (COMPLETED)
- [x] Create getStockValuationByLocation() report procedure
- [x] Create getSupplierOutstandingBalances() report procedure
- [x] Create getInvoiceAgingSummary() report procedure
- [x] Create reporting router with all report procedures
- [x] Integrate with existing ledger and cost flow data

### 5. API Integration (COMPLETED)
- [x] Create phase2.ts router with all sub-routers
- [x] Integrate phase2Router into main appRouter
- [x] Create comprehensive API documentation (PHASE2_IMPLEMENTATION.md)
- [x] All tRPC procedures fully typed and validated

## PHASE-2 UI IMPLEMENTATION (PENDING)

### 6. UI Implementation
- [ ] Create stock management dashboard page
- [ ] Create purchase workflow UI (PO, GRN, Finalization)
- [ ] Create transfer workflow UI (Request, Approval, Dispatch, Receive)
- [ ] Create payment allocation UI
- [ ] Create operational reports pages
- [ ] Integrate all new routers into frontend
- [ ] Add navigation for new features

### 7. Integration & Testing
- [ ] Run full integration tests
- [ ] Verify stock integrity across all workflows
- [ ] Verify purchase workflow end-to-end
- [ ] Verify transfer workflow end-to-end
- [ ] Verify payment allocation end-to-end
- [ ] Verify reports accuracy
- [ ] Performance testing on large datasets
- [ ] Final UI polish and consistency review

## COMPLETED - Phase-1 (DO NOT MODIFY)

### Summary
All Phase-1 features are fully functional and PROTECTED from modification:
- Admin Dashboard: Real KPI cards (sales, profit, stock, transfers)
- Inventory: Add/list items with serial tracking and branch filtering
- Products: Add/list products with pricing
- POS: Barcode scanning, cart management, sales creation
- Transfers: Create transfer requests, approve/reject workflow
- Ledger: View financial entries and branch balances
- Reports: Monthly and daily sales charts with branch filtering
- Audit Trail: Search and filter all system actions
- Users: Assign roles and branches to users
- Financial Engine: Cost flow logic, profit split (70/30), branch ledger

### Data Flow
- All pages use tRPC queries/mutations to fetch and save real data
- Forms validate input and show success/error toasts
- Tables display data with proper formatting and filtering
- Charts render real sales data from database
- Real-time updates via refetch on mutations


## PHASE-2 UI IMPLEMENTATION (COMPLETED)

### Stock Protection Layer UI
- [x] Create Stock Management Dashboard page (client/src/pages/Phase2/StockManagement.tsx)
- [x] Display real-time stock levels by product and branch
- [x] Show stock reservations and available quantities
- [x] Implement stock valuation report with location filtering
- [x] Add stock alerts and low-stock warnings
- [x] Integrate stock availability checks into POS workflow
- [x] Integrate stock checks into transfer workflow

### Purchase Workflow UI
- [x] Create Purchase Orders page (list, create, edit, submit, approve)
- [x] Create GRN (Goods Received Note) page with item receipt
- [x] Create Landing Cost entry interface
- [x] Create Purchase Finalization page with supplier payable confirmation
- [x] Display purchase workflow status and audit trail
- [x] Add GRN reversal confirmation dialog
- [x] Implement purchase order approval workflow for admins

### Transfer Workflow UI
- [x] Create Transfer Request page (branch requests stock)
- [x] Create Transfer Approval page (admin approves requests)
- [x] Create Transfer Dispatch page (warehouse deducts stock)
- [x] Create Transfer Receive page (branch receives stock)
- [x] Display transfer status and profit calculations
- [x] Implement transfer workflow stage transitions
- [x] Add transfer audit trail visibility

### Payment Allocation UI
- [x] Create Invoice Management page (list, create, issue)
- [x] Create Payment Recording interface (full/partial/overpayment)
- [x] Create Invoice Aging Report with bucket visualization
- [x] Create Supplier Outstanding Balances report
- [x] Create Customer Outstanding Invoices view
- [x] Implement payment allocation visualization
- [x] Add credit balance tracking for overpayments

### Operational Reports UI
- [x] Create Stock Valuation Report page (by location, with filtering)
- [x] Create Branch Profitability Report (by date range)
- [x] Create Transfer Profit Summary report
- [x] Create Supplier Outstanding Balances report
- [x] Create Daily Cash Flow Report
- [x] Add report export functionality (CSV, PDF)
- [x] Implement report date range filtering

### Integration & Navigation
- [x] Add Phase-2 menu items to DashboardLayout sidebar
- [x] Create Phase-2 routes in App.tsx
- [x] Integrate stock checks into existing POS workflow
- [x] Integrate stock checks into existing transfer workflow
- [x] Add role-based access control for Phase-2 features
- [x] Implement loading states and error handling
- [x] Add success/error toast notifications

### Testing & Validation
- [ ] Test stock protection rules in POS workflow
- [ ] Test purchase workflow end-to-end
- [ ] Test transfer workflow stage transitions
- [ ] Test payment allocation and invoice aging
- [ ] Verify reports accuracy with sample data
- [ ] Test role-based access control
- [ ] Performance test with large datasets
