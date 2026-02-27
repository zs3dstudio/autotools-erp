/**
 * App.tsx — Phase-3 Multi-Branch Access Control + Phase-4 Financial Control
 * Role-based routing for SuperAdmin, Admin, BranchManager, and POSUser.
 *
 * LAYOUT STRATEGY (UI/UX Stabilization):
 * DashboardLayout is applied ONCE at the router level via <AuthenticatedLayout>.
 * Individual page components render their own content only — no per-page layout wrapping.
 * This guarantees the sidebar is always present on every authenticated route.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";

// Dashboard pages
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";

// Core modules
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Transfers from "./pages/Transfers";
import Ledger from "./pages/Ledger";
import Reports from "./pages/Reports";
import AuditTrail from "./pages/AuditTrail";
import CompanySettings from "./pages/CompanySettings";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import BarcodeLabels from "./pages/BarcodeLabels";

// Phase-2 modules
import StockManagement from "./pages/Phase2/StockManagement";
import PurchaseWorkflow from "./pages/Phase2/PurchaseWorkflow";
import TransferWorkflow from "./pages/Phase2/TransferWorkflow";
import PaymentAllocation from "./pages/Phase2/PaymentAllocation";
import OperationalReports from "./pages/Phase2/OperationalReports";

// Phase-3 modules
import BranchManagement from "./pages/BranchManagement";
import UserManagement from "./pages/UserManagement";

// Phase-4 Financial Control modules
import FinancialDashboard from "./pages/Financials/FinancialDashboard";
import SupplierLedger from "./pages/Financials/SupplierLedger";
import HOPayments from "./pages/Financials/HOPayments";
import Investors from "./pages/Financials/Investors";
import ProfitDistribution from "./pages/Financials/ProfitDistribution";

// Phase-5 Business Intelligence modules
import AnalyticsDashboard from "./pages/Phase5/AnalyticsDashboard";
import AdvancedReports from "./pages/Phase5/AdvancedReports";
import AlertsPanel from "./pages/Phase5/AlertsPanel";
import DailySummaries from "./pages/Phase5/DailySummaries";
import GlobalAuditLog from "./pages/Phase5/GlobalAuditLog";

type UserRole = "SuperAdmin" | "Admin" | "BranchManager" | "POSUser" | "admin" | "manager" | "cashier" | "user";

function isAdminRole(role: UserRole) {
  return role === "SuperAdmin" || role === "Admin" || role === "admin";
}

function isManagerRole(role: UserRole) {
  return isAdminRole(role) || role === "BranchManager" || role === "manager";
}

function isPOSRole(role: UserRole) {
  return role === "POSUser" || role === "cashier";
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading AutoTools ERP...</p>
      </div>
    </div>
  );
}

/**
 * AuthenticatedLayout — single shared wrapper applied at router level.
 * All authenticated routes render inside this component, guaranteeing
 * the sidebar is always visible after login regardless of which page
 * component is rendered.
 */
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Not authenticated — show login
  if (!user) return <Home />;

  const role = user.role as UserRole;

  // POSUser: only access POS
  if (isPOSRole(role)) {
    return (
      <AuthenticatedLayout>
        <Switch>
          <Route path="/" component={POS} />
          <Route path="/pos" component={POS} />
          <Route path="/customers" component={Customers} />
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    );
  }

  // BranchManager: own branch data only
  if (role === "BranchManager" || role === "manager") {
    return (
      <AuthenticatedLayout>
        <Switch>
          <Route path="/" component={ManagerDashboard} />
          <Route path="/dashboard" component={ManagerDashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/products" component={Products} />
          <Route path="/pos" component={POS} />
          <Route path="/transfers" component={Transfers} />
          <Route path="/ledger" component={Ledger} />
          <Route path="/reports" component={Reports} />
          <Route path="/customers" component={Customers} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/barcode-labels" component={BarcodeLabels} />
          <Route path="/phase2/stock-management" component={StockManagement} />
          <Route path="/phase2/purchase-workflow" component={PurchaseWorkflow} />
          <Route path="/phase2/transfer-workflow" component={TransferWorkflow} />
          <Route path="/phase2/payment-allocation" component={PaymentAllocation} />
          <Route path="/phase2/operational-reports" component={OperationalReports} />
          {/* Phase-4: BranchManager can submit HO payments */}
          <Route path="/financials/ho-payments" component={HOPayments} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    );
  }

  // Admin / SuperAdmin: full access
  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/dashboard" component={AdminDashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/products" component={Products} />
        <Route path="/pos" component={POS} />
        <Route path="/transfers" component={Transfers} />
        <Route path="/ledger" component={Ledger} />
        <Route path="/reports" component={Reports} />
        <Route path="/audit" component={AuditTrail} />
        <Route path="/company-settings" component={CompanySettings} />
        <Route path="/customers" component={Customers} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/barcode-labels" component={BarcodeLabels} />
        {/* Phase-3 Routes */}
        <Route path="/branches" component={BranchManagement} />
        <Route path="/users" component={UserManagement} />
        {/* Phase-2 Routes */}
        <Route path="/phase2/stock-management" component={StockManagement} />
        <Route path="/phase2/purchase-workflow" component={PurchaseWorkflow} />
        <Route path="/phase2/transfer-workflow" component={TransferWorkflow} />
        <Route path="/phase2/payment-allocation" component={PaymentAllocation} />
        <Route path="/phase2/operational-reports" component={OperationalReports} />
        {/* Phase-4 Financial Control Routes */}
        <Route path="/financials" component={FinancialDashboard} />
        <Route path="/financials/supplier-ledger" component={SupplierLedger} />
        <Route path="/financials/ho-payments" component={HOPayments} />
        <Route path="/financials/investors" component={Investors} />
        <Route path="/financials/distribution" component={ProfitDistribution} />
        {/* Phase-5 Business Intelligence Routes */}
        <Route path="/phase5/analytics" component={AnalyticsDashboard} />
        <Route path="/phase5/reports" component={AdvancedReports} />
        <Route path="/phase5/alerts" component={AlertsPanel} />
        <Route path="/phase5/snapshots" component={DailySummaries} />
        <Route path="/phase5/audit-log" component={GlobalAuditLog} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
