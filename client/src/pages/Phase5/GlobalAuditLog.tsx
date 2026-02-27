/**
 * Phase-5: Global Audit Log System
 *
 * Enhanced audit trail with:
 * - Module-based filtering (Inventory, Sales, Transfers, Payments, etc.)
 * - Action category filtering (stock_change, transfer_approval, payment_approval, cost_modification)
 * - Record ID lookup
 * - Summary stats widgets
 * - Export to Excel
 * - Color-coded action types
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  Shield, Search, FileSpreadsheet, BarChart3, Clock,
  Package, ShoppingCart, ArrowRightLeft, CreditCard, Users, Settings,
} from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "inventory", label: "Inventory" },
  { value: "sales", label: "Sales" },
  { value: "transfers", label: "Transfers" },
  { value: "payments", label: "Payments" },
  { value: "financials", label: "Financials" },
  { value: "users", label: "Users" },
  { value: "branches", label: "Branches" },
  { value: "system", label: "System" },
];

const ACTION_CATEGORY_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "stock_change", label: "Stock Changes" },
  { value: "transfer_approval", label: "Transfer Approvals" },
  { value: "payment_approval", label: "Payment Approvals" },
  { value: "cost_modification", label: "Cost Modifications" },
  { value: "sale", label: "Sales" },
  { value: "user_management", label: "User Management" },
];

const MODULE_ICONS: Record<string, React.ElementType> = {
  inventory: Package,
  sales: ShoppingCart,
  transfers: ArrowRightLeft,
  payments: CreditCard,
  financials: BarChart3,
  users: Users,
  branches: Settings,
  system: Settings,
};

function getActionColor(action: string): string {
  if (action.startsWith("CREATE") || action.startsWith("RECEIVE") || action.startsWith("ADD")) return "text-green-400";
  if (action.startsWith("UPDATE") || action.startsWith("ASSIGN") || action.startsWith("MODIFY")) return "text-blue-400";
  if (action.startsWith("DELETE") || action.startsWith("VOID") || action.startsWith("REJECT")) return "text-red-400";
  if (action.startsWith("APPROVE") || action.startsWith("COMPLETE")) return "text-orange-400";
  if (action.startsWith("TRANSFER") || action.startsWith("STOCK")) return "text-purple-400";
  return "text-muted-foreground";
}

function today() { return new Date().toISOString().split("T")[0]; }
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function GlobalAuditLog() {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("all");
  const [actionCategory, setActionCategory] = useState("all");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const { data: logs, isLoading } = trpc.phase5AuditLog.list.useQuery({
    module: module !== "all" ? module : undefined,
    actionCategory: actionCategory !== "all" ? actionCategory : undefined,
    entityId: entityId || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: 300,
  });

  const { data: stats } = trpc.phase5AuditLog.stats.useQuery();

  // Client-side text search
  const filteredLogs = (logs || []).filter((log: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.userName ?? "").toLowerCase().includes(q) ||
      (log.userEmail ?? "").toLowerCase().includes(q) ||
      (log.action ?? "").toLowerCase().includes(q) ||
      (log.entityType ?? "").toLowerCase().includes(q) ||
      (log.details ?? "").toLowerCase().includes(q) ||
      String(log.entityId ?? "").includes(q)
    );
  });

  const handleExcelExport = () => {
    const data = filteredLogs.map((log: any) => ({
      "Timestamp": new Date(log.createdAt).toLocaleString(),
      "User": log.userName ?? "System",
      "Email": log.userEmail ?? "—",
      "Action": log.action,
      "Module": log.entityType,
      "Record ID": log.entityId ?? "—",
      "Branch ID": log.branchId ?? "—",
      "Details": log.details ?? "—",
      "IP Address": log.ipAddress ?? "—",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    XLSX.writeFile(wb, `audit-log-${from}-to-${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Global Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">Complete system activity trail with module and action filtering</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExcelExport} disabled={!filteredLogs.length}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          Export Excel
        </Button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
              <p className="text-xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
              <p className="text-xl font-bold text-blue-400">{stats.todayCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border lg:col-span-2">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-2">Top Modules</p>
              <div className="flex flex-wrap gap-1.5">
                {(stats.byModule ?? []).slice(0, 5).map((m: any) => (
                  <Badge key={m.entityType} variant="secondary" className="text-xs">
                    {m.entityType}: {m.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="User, action, module, record ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
            {/* Module */}
            <div className="space-y-1">
              <Label className="text-xs">Module</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Action Category */}
            <div className="space-y-1">
              <Label className="text-xs">Action Type</Label>
              <Select value={actionCategory} onValueChange={setActionCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_CATEGORY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Record ID */}
            <div className="space-y-1">
              <Label className="text-xs">Record ID</Label>
              <Input
                placeholder="e.g. 42"
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            {/* Date Range */}
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredLogs.length}</span> events
        </p>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading audit log...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No audit events found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log: any) => {
                    const ModuleIcon = MODULE_ICONS[
                      Object.keys(MODULE_ICONS).find(k =>
                        (log.entityType ?? "").toLowerCase().includes(k)
                      ) ?? ""
                    ] ?? Shield;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2.5">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <p className="text-sm font-medium leading-none">{log.userName ?? "System"}</p>
                          {log.userEmail && (
                            <p className="text-xs text-muted-foreground mt-0.5">{log.userEmail}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className={`text-xs font-mono font-semibold ${getActionColor(log.action ?? "")}`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <ModuleIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{log.entityType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {log.entityId ? (
                            <Badge variant="outline" className="text-xs font-mono">#{log.entityId}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 max-w-xs">
                          <p className="text-xs text-muted-foreground truncate" title={log.details}>
                            {log.details ?? "—"}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
