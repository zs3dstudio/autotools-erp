/**
 * Phase-5: Alert & Notification Panel
 *
 * Shows all system alerts with:
 * - Color-coded severity (info/warning/critical)
 * - Timestamps
 * - Alert type icons
 * - Resolve / Mark Read actions
 * - Manual alert check trigger
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, RefreshCw,
  Package, CreditCard, TrendingUp, ShoppingCart, Bell, BellOff,
} from "lucide-react";
import { useState } from "react";

type AlertType = "LowStock" | "OverdueSupplierPayment" | "OverdueBranchPayment" | "LargeSale" | "StockAdjustment";
type Severity = "info" | "warning" | "critical";

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critical: { label: "Critical", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: AlertCircle },
  warning: { label: "Warning", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle },
  info: { label: "Info", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: Info },
};

const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: React.ElementType }> = {
  LowStock: { label: "Low Stock", icon: Package },
  OverdueSupplierPayment: { label: "Supplier Payable", icon: CreditCard },
  OverdueBranchPayment: { label: "Branch Payment", icon: TrendingUp },
  LargeSale: { label: "Large Sale", icon: ShoppingCart },
  StockAdjustment: { label: "Stock Adjustment", icon: Package },
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AlertsPanel() {
  const [filterResolved, setFilterResolved] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");

  const utils = trpc.useUtils();

  const { data: alerts, isLoading, refetch } = trpc.alerts.list.useQuery({
    isResolved: filterResolved,
    severity: filterSeverity !== "all" ? filterSeverity : undefined,
  });

  const { data: countData } = trpc.alerts.unresolvedCount.useQuery();

  const resolveMutation = trpc.alerts.resolve.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      utils.alerts.unresolvedCount.invalidate();
      toast.success("Alert resolved", { description: "The alert has been marked as resolved." });
    },
  });

  const markReadMutation = trpc.alerts.markRead.useMutation({
    onSuccess: () => utils.alerts.list.invalidate(),
  });

  const markAllReadMutation = trpc.alerts.markAllRead.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success("All alerts marked as read");
    },
  });

  const runCheckMutation = trpc.alerts.runAlertCheck.useMutation({
    onSuccess: (data) => {
      utils.alerts.list.invalidate();
      utils.alerts.unresolvedCount.invalidate();
      toast.success("Alert check complete", { description: `${data.triggered} new alert(s) triggered.` });
    },
    onError: (err) => {
      toast.error("Alert check failed", { description: err.message });
    },
  });

  const unreadCount = (alerts || []).filter((a: any) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Alert Panel
            {(countData?.count ?? 0) > 0 && (
              <Badge className="bg-red-500 text-white ml-1">{countData?.count}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">System-generated alerts and notifications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0}
          >
            <BellOff className="h-4 w-4 mr-1.5" />
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runCheckMutation.mutate()}
            disabled={runCheckMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${runCheckMutation.isPending ? "animate-spin" : ""}`} />
            Run Alert Check
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterResolved ? "outline" : "default"}
          size="sm"
          onClick={() => setFilterResolved(false)}
        >
          Active
        </Button>
        <Button
          variant={filterResolved ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterResolved(true)}
        >
          Resolved
        </Button>
        <div className="w-px bg-border mx-1" />
        {(["all", "critical", "warning", "info"] as const).map(s => (
          <Button
            key={s}
            variant={filterSeverity === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSeverity(s)}
            className={
              s === "critical" && filterSeverity === s ? "bg-red-500 hover:bg-red-600" :
              s === "warning" && filterSeverity === s ? "bg-yellow-500 hover:bg-yellow-600 text-black" :
              s === "info" && filterSeverity === s ? "bg-blue-500 hover:bg-blue-600" : ""
            }
          >
            {s === "all" ? "All Severities" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardContent className="py-6" />
            </Card>
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-lg font-medium">All clear!</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filterResolved ? "No resolved alerts found." : "No active alerts at this time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const severity = alert.severity as Severity;
            const alertType = alert.alertType as AlertType;
            const sevConfig = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
            const typeConfig = ALERT_TYPE_CONFIG[alertType] ?? { label: alertType, icon: Bell };
            const SevIcon = sevConfig.icon;
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={alert.id}
                className={`border transition-all ${sevConfig.bg} ${!alert.isRead ? "ring-1 ring-inset ring-current/20" : "opacity-75"}`}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <SevIcon className={`h-5 w-5 mt-0.5 shrink-0 ${sevConfig.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{alert.title}</span>
                          <Badge variant="outline" className={`text-xs ${sevConfig.color}`}>
                            {sevConfig.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {typeConfig.label}
                          </Badge>
                          {!alert.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{timeAgo(alert.createdAt)}</span>
                          {alert.branchName && <span>· {alert.branchName}</span>}
                          {alert.isResolved && <span className="text-green-400">· Resolved</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markReadMutation.mutate({ id: alert.id })}
                        >
                          Mark Read
                        </Button>
                      )}
                      {!alert.isResolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
                          onClick={() => resolveMutation.mutate({ id: alert.id })}
                          disabled={resolveMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
