# Phase 5 Implementation Plan: Reporting, Automation & BI

This document outlines the design and implementation strategy for extending the AutoTools ERP system with Phase 5 features. The core principle is to build upon the existing Phase 4 foundation without altering any core logic, accounting formulas, or permission structures.

## 1. Database Schema Additions

To support the new features, the following tables will be added to `/home/ubuntu/erp-phase5/drizzle/schema.ts` and the corresponding SQLite definitions in `/home/ubuntu/erp-phase5/server/_core/previewDb.ts`.

### 1.1. `daily_summaries` Table

This table will store the results of the automated daily business snapshot.

```typescript
export const dailySummaries = mysqlTable("daily_summaries", {
  id: int("id").autoincrement().primaryKey(),
  summaryDate: date("summaryDate").notNull().unique(),
  totalSales: decimal("totalSales", { precision: 14, scale: 2 }).notNull(),
  totalProfit: decimal("totalProfit", { precision: 14, scale: 2 }).notNull(),
  branchPerformance: json("branchPerformance").notNull(), // JSON: [{ branchId, name, totalSales, totalProfit }]
  lowStockItems: json("lowStockItems").notNull(), // JSON: [{ productId, name, branchId, currentStock, reorderLevel }]
  overduePayments: json("overduePayments").notNull(), // JSON: [{ type: 'Supplier'|'Branch', id, name, amount, daysOverdue }]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

### 1.2. `alerts` Table

This table will store system-generated alerts for various events. It is designed to be more generic than the existing `reorderAlerts` table.

```typescript
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alertType", ["LowStock", "OverduePayment", "LargeSale"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("warning").notNull(),
  message: text("message").notNull(),
  referenceType: varchar("referenceType", { length: 64 }), // e.g., 'Product', 'Supplier', 'Branch', 'Sale'
  referenceId: int("referenceId"),
  branchId: int("branchId"),
  isResolved: boolean("isResolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedByUserId: int("resolvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

## 2. Backend API & Automation Logic

### 2.1. Global Audit Log Enhancement

The existing `auditLogs` table is sufficient. The focus will be on integrating logging calls into the relevant business logic flows:
-   **Stock Changes**: Wrap functions like `updateInventoryItemStock` to log adjustments.
-   **Transfer/Payment Approvals**: Add audit logs within `approveTransfer` and `approveHOPayment` functions.
-   **Cost Modifications**: Log changes made via `updateProduct`.

### 2.2. Automated Daily Snapshot (Cron Job)

A new file, `/home/ubuntu/erp-phase5/server/cron/dailySnapshot.ts`, will contain the logic for the daily summary. A cron job will be configured (e.g., using a library like `node-cron` integrated into `server/_core/index.ts`) to execute this script at midnight.

**Logic Outline:**
1.  Calculate total sales and profit for the previous day.
2.  Query branch performance (sales and profit per branch).
3.  Fetch unresolved low stock items from the `reorderAlerts` table.
4.  Identify overdue supplier payables and branch payments.
5.  Insert the compiled data into the `daily_summaries` table.

### 2.3. Alert & Notification Engine

A new router, `/home/ubuntu/erp-phase5/server/routers/alerts.ts`, will be created.

-   **Triggers**: Logic will be added to existing services to create alerts:
    -   `LowStock`: The existing `reorderAlerts` logic will be modified to also create a corresponding entry in the new `alerts` table.
    -   `OverduePayment`: The daily cron job will check for overdue supplier and branch payments and create alerts.
    -   `LargeSale`: The `createSale` function will be modified to check if the sale total exceeds a configurable threshold (to be added in `companySettings`) and create an alert if it does.
-   **API Endpoints**:
    -   `alerts.list`: Get unresolved alerts, with filters for type and branch.
    -   `alerts.resolve`: Mark an alert as resolved.

### 2.4. Advanced Reporting System

The existing `/home/ubuntu/erp-phase5/server/routers/reports.ts` will be expanded.

-   **New Endpoints**:
    -   `reports.dailySales`: Fetches sales data, filterable by date range and branch.
    -   `reports.monthlyRevenue`: Aggregates revenue monthly, filterable by year and branch.
    -   `reports.profitBreakdown`: Calculates and returns company profit, branch profit, master share, and investor distribution for a given period.
    -   `reports.supplierPayables`: Retrieves outstanding balances from `supplierLedger`.
    -   `reports.branchOutstanding`: Retrieves pending `hoPayments`.
-   **Export Logic**: The API endpoints will return JSON data. The client-side will handle the formatting and export to Excel (using the existing `xlsx` library) and PDF (using a new library like `jspdf` and `jspdf-autotable`).

## 3. Frontend UI/UX Components

### 3.1. New Navigation Items

In `/home/ubuntu/erp-phase5/client/src/components/DashboardLayout.tsx`, a new section for "Analytics & Alerts" will be added to the sidebar for admins, including:
-   **Alerts**: A link to a new `/alerts` page.
-   **Daily Summaries**: A link to a new `/daily-summaries` page.

The existing "Reports" link will point to the enhanced reporting page.

### 3.2. Business Analytics Dashboard (`/client/src/pages/AdminDashboard.tsx`)

The admin dashboard will be enhanced with new widgets:
-   **Alerts Panel**: A new component showing a summary of unresolved critical alerts.
-   **Best Selling Products Chart**: A bar chart using the existing `reports.topProducts` endpoint.
-   **Branch Performance Comparison**: A bar or table view comparing sales and profit across branches.
-   **Monthly Revenue & Profit Trends**: Line charts for the last 12 months.
-   **Top Customers**: A table listing top customers by purchase value.

### 3.3. New Pages

-   **/client/src/pages/AdvancedReports.tsx**: A new, comprehensive reporting page with tabs for each new report. Each tab will feature date/branch filters and Export to Excel/PDF buttons.
-   **/client/src/pages/Alerts.tsx**: A page to display and manage all system alerts in a filterable table, with actions to view details and resolve them.
-   **/client/src/pages/DailySummary.tsx**: A page for admins to view historical daily summaries, selecting a date to see the snapshot for that day.
