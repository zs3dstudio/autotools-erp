import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { branchesRouter } from "./routers/branches";
import { productsRouter } from "./routers/products";
import { inventoryRouter } from "./routers/inventory";
import { transfersRouter } from "./routers/transfers";
import { ledgerRouter } from "./routers/ledger";
import { posRouter } from "./routers/pos";
import { reportsRouter } from "./routers/reports";
import { auditRouter } from "./routers/audit";
import { usersRouter } from "./routers/users";
import { companySettingsRouter } from "./routers/companySettings";
import { customersRouter } from "./routers/customers";
import { expensesRouter } from "./routers/expenses";
import { phase2Router } from "./routers/phase2";
import { financialsRouter } from "./routers/financials";
// Phase-5: Reporting, Automation, Alerts & BI
import { phase5ReportsRouter } from "./routers/phase5Reports";
import { alertsRouter } from "./routers/alerts";
import { dailySummaryRouter } from "./routers/dailySummary";
import { phase5AuditLogRouter } from "./routers/phase5AuditLog";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  branches: branchesRouter,
  products: productsRouter,
  inventory: inventoryRouter,
  pos: posRouter,
  transfers: transfersRouter,
  ledger: ledgerRouter,
  reports: reportsRouter,
  audit: auditRouter,
  users: usersRouter,
  companySettings: companySettingsRouter,
  customers: customersRouter,
  expenses: expensesRouter,
  phase2: phase2Router,
  financials: financialsRouter,
  // Phase-5
  phase5Reports: phase5ReportsRouter,
  alerts: alertsRouter,
  dailySummary: dailySummaryRouter,
  phase5AuditLog: phase5AuditLogRouter,
});

export type AppRouter = typeof appRouter;
