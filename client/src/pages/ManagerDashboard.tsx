import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, Package, ArrowRightLeft, AlertCircle, TrendingUp } from "lucide-react";
import { useState } from "react";

export default function ManagerDashboard() {
  const { user } = useAuth();
  // BranchManager's branch is stored directly on the user object
  const userBranchesData = user?.branchId ? [{ branchId: user.branchId }] : [];
  const { data: branches } = trpc.branches.list.useQuery();

  // Use the first assigned branch, or let manager select
  const assignedBranchIds = userBranchesData?.map((ub: any) => ub.branchId) ?? [];
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const branchId = selectedBranchId ?? assignedBranchIds[0] ?? null;

  const { data: stats, isLoading } = trpc.reports.dashboardStats.useQuery(
    { branchId: branchId ?? undefined },
    { enabled: !!branchId }
  );
  const { data: monthlySales } = trpc.reports.monthlySales.useQuery(
    { branchId: branchId ?? undefined },
    { enabled: !!branchId }
  );
  const { data: reorderAlerts } = trpc.inventory.reorderAlerts.useQuery(
    { branchId: branchId ?? undefined },
    { enabled: !!branchId }
  );

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = (monthlySales || []).map((m: any) => ({
    month: monthLabels[m.month - 1],
    sales: parseFloat(m.totalSales) || 0,
    count: Number(m.count) || 0,
  }));

  const assignedBranches = branches?.filter((b: any) => assignedBranchIds.includes(b.id)) ?? [];
  const currentBranch = branches?.find((b: any) => b.id === branchId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Branch Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
        </div>
        {assignedBranches.length > 1 && (
          <div>
            <label className="text-sm font-medium mr-2">Branch:</label>
            <select
              value={branchId ?? ""}
              onChange={(e) => setSelectedBranchId(parseInt(e.target.value) || null)}
              className="input-field"
            >
              {assignedBranches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!branchId ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No branch assigned. Contact your administrator.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {currentBranch && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentBranch.name}</span>
              <span>•</span>
              <span>{currentBranch.code}</span>
              {currentBranch.address && (
                <>
                  <span>•</span>
                  <span>{currentBranch.address}</span>
                </>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card border-border animate-pulse">
                  <CardContent className="py-8" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Branch Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">
                    ${(stats?.totalSales ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.totalSalesCount ?? 0} transactions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Branch Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    ${(stats?.totalProfit ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Net profit from sales
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
                  <Package className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {stats?.availableStock ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">items in branch</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">
                    {stats?.pendingTransfers ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">awaiting approval</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reorder Alerts */}
          {reorderAlerts && reorderAlerts.length > 0 && (
            <Card className="bg-card border-border border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  Low Stock Alerts ({reorderAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {reorderAlerts.slice(0, 8).map((alert: any) => (
                    <div key={alert.id} className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-xs text-muted-foreground">Product #{alert.productId}</p>
                      <p className="text-sm font-bold text-yellow-400">
                        {alert.currentStock} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reorder at {alert.reorderLevel}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Sales Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Monthly Sales — {new Date().getFullYear()}</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No sales data for this branch yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 250)" />
                    <XAxis dataKey="month" stroke="oklch(0.65 0.05 250)" />
                    <YAxis stroke="oklch(0.65 0.05 250)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.18 0.02 250)",
                        border: "1px solid oklch(0.25 0.03 250)",
                      }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                    />
                    <Legend />
                    <Bar dataKey="sales" fill="oklch(0.65 0.2 45)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
