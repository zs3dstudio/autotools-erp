/**
 * DashboardLayout — Shared Application Shell (Phase-5)
 *
 * This is the SINGLE shared layout wrapper for the entire application.
 * It is applied ONCE at the router level in App.tsx via <AuthenticatedLayout>.
 *
 * IMPORTANT: Individual page components must NOT import or wrap themselves
 * in this component. Doing so would cause double-nesting (sidebar inside sidebar).
 *
 * Custom sidebar nav uses plain HTML elements to avoid Shadcn SidebarMenu
 * positioning bugs that cause nav items to overlap section headers.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Users, Package, ShoppingCart,
  ArrowRightLeft, DollarSign, FileText, BarChart3, BookOpen,
  Building2, UserCircle, Receipt, QrCode, Warehouse, TrendingUp,
  CreditCard, Settings, Bell, LineChart, CalendarDays, Activity,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: string[];
  requirePermission?: string;
  section?: string;
};

const ALL_NAV_ITEMS: NavItem[] = [
  // Main
  { icon: LayoutDashboard, label: "Dashboard",          path: "/dashboard",                  section: "main" },
  { icon: BookOpen,        label: "Products",            path: "/products",                   section: "main" },
  { icon: Package,         label: "Inventory",           path: "/inventory",                  section: "main" },
  { icon: ShoppingCart,    label: "POS",                 path: "/pos",                        section: "main" },
  { icon: ArrowRightLeft,  label: "Transfers",           path: "/transfers",                  section: "main", requirePermission: "canTransferRequest" },
  { icon: UserCircle,      label: "Customers",           path: "/customers",                  section: "main" },
  { icon: Receipt,         label: "Expenses",            path: "/expenses",                   section: "main" },
  { icon: DollarSign,      label: "Ledger",              path: "/ledger",                     section: "main", requirePermission: "canViewLedger" },
  { icon: FileText,        label: "Reports",             path: "/reports",                    section: "main" },
  { icon: QrCode,          label: "Barcode Labels",      path: "/barcode-labels",             section: "main" },
  // Admin
  { icon: BarChart3,       label: "Audit Trail",         path: "/audit",                      section: "admin", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: Building2,       label: "Branches",            path: "/branches",                   section: "admin", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: Users,           label: "Users",               path: "/users",                      section: "admin", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: Settings,        label: "Company Settings",    path: "/company-settings",           section: "admin", roles: ["SuperAdmin", "Admin", "admin"] },
  // Phase-2
  { icon: Warehouse,       label: "Stock Management",    path: "/phase2/stock-management",    section: "phase2" },
  { icon: FileText,        label: "Purchase Workflow",   path: "/phase2/purchase-workflow",   section: "phase2" },
  { icon: TrendingUp,      label: "Transfer Workflow",   path: "/phase2/transfer-workflow",   section: "phase2" },
  { icon: CreditCard,      label: "Payment Allocation",  path: "/phase2/payment-allocation",  section: "phase2" },
  { icon: BarChart3,       label: "Operational Reports", path: "/phase2/operational-reports", section: "phase2" },
  // Phase-4 Financial Control
  { icon: TrendingUp,      label: "Financial Dashboard", path: "/financials",                 section: "financials", requirePermission: "canViewFinancials" },
  { icon: DollarSign,      label: "Supplier Ledger",     path: "/financials/supplier-ledger", section: "financials", requirePermission: "canViewFinancials" },
  { icon: CreditCard,      label: "HO Payments",         path: "/financials/ho-payments",     section: "financials" },
  { icon: Users,           label: "Investors",           path: "/financials/investors",       section: "financials", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: BarChart3,       label: "Profit Distribution", path: "/financials/distribution",    section: "financials", requirePermission: "canViewFinancials" },
  // Phase-5 Business Intelligence
  { icon: LineChart,       label: "Analytics Dashboard", path: "/phase5/analytics",           section: "phase5", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: FileText,        label: "Advanced Reports",    path: "/phase5/reports",             section: "phase5", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: Bell,            label: "Alert Panel",         path: "/phase5/alerts",              section: "phase5", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: CalendarDays,    label: "Daily Snapshots",     path: "/phase5/snapshots",           section: "phase5", roles: ["SuperAdmin", "Admin", "admin"] },
  { icon: Activity,        label: "Global Audit Log",    path: "/phase5/audit-log",           section: "phase5", roles: ["SuperAdmin", "Admin", "admin"] },
];

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: "Super Admin",
  Admin: "Admin",
  BranchManager: "Branch Manager",
  POSUser: "POS User",
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
  user: "User",
};

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: "bg-red-500/10 text-red-400",
  Admin: "bg-blue-500/10 text-blue-400",
  BranchManager: "bg-purple-500/10 text-purple-400",
  POSUser: "bg-green-500/10 text-green-400",
  admin: "bg-blue-500/10 text-blue-400",
  manager: "bg-purple-500/10 text-purple-400",
  cashier: "bg-green-500/10 text-green-400",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 240;
const MAX_WIDTH = 480;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    // Force-upgrade any stale narrow width from previous builds to the new default
    return parsed < 280 ? DEFAULT_WIDTH : parsed;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-center">Sign in to continue</h1>
          <Button onClick={() => { window.location.href = "/"; }} size="lg" className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

/* ─── Single nav item button ──────────────────────────────────────────────── */
function NavButton({
  item,
  isActive,
  isCollapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? item.label : undefined}
      className={[
        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors text-left",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80",
        isCollapsed ? "justify-center px-0" : "",
      ].join(" ")}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
      {!isCollapsed && <span className="truncate leading-none">{item.label}</span>}
    </button>
  );
}

/* ─── Section with label + items ─────────────────────────────────────────── */
function NavSection({
  label,
  items,
  location,
  setLocation,
  isCollapsed,
}: {
  label: string;
  items: NavItem[];
  location: string;
  setLocation: (p: string) => void;
  isCollapsed: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1">
      {!isCollapsed && (
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            {label}
          </span>
        </div>
      )}
      {isCollapsed && <div className="my-1 mx-2 border-t border-border/40" />}
      <div className="px-2 flex flex-col gap-0.5">
        {items.map(item => {
          const isActive =
            item.path === "/financials"
              ? location === "/financials"
              : item.path === "/dashboard"
                ? location === "/dashboard"
                : location.startsWith(item.path);
          return (
            <NavButton
              key={item.path}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onClick={() => setLocation(item.path)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main layout ─────────────────────────────────────────────────────────── */
function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout, can } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const w = e.clientX - left;
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const role = user?.role ?? "";

  const visibleItems = ALL_NAV_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.requirePermission === "canTransferRequest" && !can.transferRequest) return false;
    if (item.requirePermission === "canViewLedger"      && !can.viewLedger)      return false;
    if (item.requirePermission === "canViewFinancials"  && !can.viewFinancials)  return false;
    if (role === "POSUser" || role === "cashier") {
      return ["/pos", "/customers"].includes(item.path);
    }
    return true;
  });

  const mainItems       = visibleItems.filter(i => i.section === "main");
  const adminItems      = visibleItems.filter(i => i.section === "admin");
  const phase2Items     = visibleItems.filter(i => i.section === "phase2");
  const financialsItems = visibleItems.filter(i => i.section === "financials");
  const phase5Items     = visibleItems.filter(i => i.section === "phase5");

  const activeItem = ALL_NAV_ITEMS.find(item => item.path === location);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <SidebarHeader className="h-16 justify-center border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 bg-primary rounded flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary-foreground">AT</span>
                  </div>
                  <span className="font-semibold tracking-tight truncate text-sm">AutoTools ERP</span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* ── Nav — fully custom, no SidebarMenu/SidebarMenuItem ─── */}
          {/* Plain div replaces SidebarContent to avoid flex min-h-0 overlap bug */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ minHeight: 0 }}>
            {/* Main items */}
            <div className="px-2 flex flex-col gap-0.5">
              {mainItems.map(item => {
                const isActive = location === item.path;
                return (
                  <NavButton
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onClick={() => setLocation(item.path)}
                  />
                );
              })}
            </div>

            <NavSection label="Administration"        items={adminItems}      location={location} setLocation={setLocation} isCollapsed={isCollapsed} />
            <NavSection label="Phase-2 Workflows"     items={phase2Items}     location={location} setLocation={setLocation} isCollapsed={isCollapsed} />
            <NavSection label="Financial Control"     items={financialsItems} location={location} setLocation={setLocation} isCollapsed={isCollapsed} />
            <NavSection label="Business Intelligence" items={phase5Items}     location={location} setLocation={setLocation} isCollapsed={isCollapsed} />
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <SidebarFooter className="p-3 border-t border-border/50 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{user?.name ?? "—"}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[role] ?? "bg-muted text-muted-foreground"}`}>
                          {ROLE_LABELS[role] ?? role}
                        </span>
                        {(user as any)?.branchName && (
                          <span className="text-xs text-muted-foreground truncate">· {(user as any).branchName}</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {ROLE_LABELS[role] ?? role}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground">{activeItem?.label ?? "Menu"}</span>
            </div>
            <Badge variant="outline" className="text-xs mr-2">
              {ROLE_LABELS[role] ?? role}
            </Badge>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
