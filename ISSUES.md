# AutoTools ERP — Identified Bugs & Issues

## CRITICAL BUGS

### 1. AuditTrail.tsx — Wrong field names (log.actionType, log.description, log.referenceId)
- Schema has: `action`, `details`, `entityId` — NOT `actionType`, `description`, `referenceId`
- Also displays `log.userId` (a number) instead of `log.userName`
- Fix: use `log.action`, `log.details`, `log.entityId`, `log.userName`

### 2. Products.tsx — Wrong field name `p.costPrice`
- Schema has `landingCost` and `branchCost`, NOT `costPrice`
- Margin calculation uses `p.costPrice` which is undefined → NaN%
- Fix: use `p.landingCost` for cost display and margin calculation

### 3. Transfers.tsx — Transfer items sent with inventoryItemId=0, productId=0
- The create form sends `inventoryItemId: 0, productId: 0` for all items
- The backend `createTransfer` inserts these zeros into `stock_transfer_items`
- The `approveTransfer` then tries to update `inventoryItems` by id=0 (no-op or wrong)
- Fix: resolve serial numbers to actual inventory items before creating transfer

### 4. Users.tsx — Role assignment form calls `assignBranches` but never calls `updateRole`
- The form has a "Role" dropdown but only calls `assignBranches` mutation (not `updateRole`)
- Role is never actually saved to the database
- Fix: call `updateRole` separately or combine into a single form action

### 5. Ledger.tsx — `branchId` passed as `undefined` when "All Branches" selected
- `ledger.entries` requires `branchId: z.number()` (non-optional) but the UI passes `undefined`
- This causes a tRPC validation error when no branch is selected
- Fix: require branch selection before querying, or make branchId optional in the router

### 6. AdminDashboard.tsx — Not wrapped in DashboardLayout
- Returns `<div>` directly without `<DashboardLayout>` wrapper
- Sidebar and navigation are missing on the admin dashboard
- Fix: wrap content in `<DashboardLayout>`

### 7. ManagerDashboard.tsx — Placeholder only, no real data
- Shows "Branch dashboard coming soon" with no KPIs or charts
- Fix: implement real branch-scoped dashboard using `reports.dashboardStats`

### 8. POS.tsx — `onKeyPress` is deprecated
- `onKeyPress` is deprecated in React 17+ and removed in React 19
- Fix: use `onKeyDown` instead

### 9. Inventory router — Manager branch enforcement missing
- `inventory.list` has a comment "enforced by frontend" but the backend does NOT enforce it
- A manager can query any branch's inventory
- Fix: enforce branchId filter server-side for managers

### 10. Transfer creation — Serial numbers not validated against inventory
- `createTransfer` in db.ts inserts items with whatever `inventoryItemId` is passed
- No validation that the serial numbers exist or belong to the fromBranch
- Fix: look up each serial number in the transfers router before creating

## MODERATE ISSUES

### 11. Transfers.tsx — No "Complete Transfer" (receive confirmation) button
- The UI only shows Approve/Reject for Pending transfers
- There is no button for InTransit → Completed transition
- Fix: add "Mark as Received" button for InTransit transfers

### 12. Reports.tsx — Commented-out dailySales query
- `// const { data: dailySales } = trpc.reports.dailySales.useQuery(...)` is commented out
- The daily sales chart section is empty
- Fix: implement daily sales report endpoint and display

### 13. Ledger.tsx — Running balance column missing from table
- The table shows Debit/Credit but not the running balance
- Fix: add runningBalance column to the ledger table

### 14. Users.tsx — Search input is rendered but not used
- `search` state is set but never used to filter the users list
- Fix: filter users client-side by name/email

### 15. POS.tsx — Receipt print button does nothing
- "Print Receipt" button has no onClick handler
- Fix: implement receipt print functionality using window.print()

### 16. DashboardLayout.tsx — "Products" menu item missing
- The sidebar has no link to /products
- Fix: add Products menu item

### 17. voidSale — Inventory items restored to original branch but branchId not tracked
- When voiding a sale, inventory items are set back to Available
- But if items were transferred between branches, the branchId may be wrong
- Minor: acceptable for now but worth noting

### 18. checkAndCreateReorderAlerts — Runs for ALL products, not just those in the branch
- Iterates all active products and checks stock for each in the branch
- For branches with many products not stocked, creates false "0 stock" alerts
- Fix: only check products that have had inventory in that branch

## DEPLOYMENT ISSUES

### 19. No .env.example file
- No example environment file for deployment reference
- Fix: create .env.example

### 20. No Docker/docker-compose configuration
- No containerization setup for production deployment
- Fix: add Dockerfile and docker-compose.yml

### 21. No health check endpoint
- No /health or /api/health endpoint for load balancer/monitoring
- Fix: add health check route

### 22. vite.config.ts — Production build includes Manus-specific plugins
- `vitePluginManusRuntime` and `vitePluginManusDebugCollector` are dev-only tools
- They are included unconditionally in the plugins array
- Fix: conditionally include based on NODE_ENV
