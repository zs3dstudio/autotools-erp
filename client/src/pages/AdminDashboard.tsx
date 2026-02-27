import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { DollarSign, Package, TrendingUp, AlertCircle, ArrowRightLeft } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.reports.dashboardStats.useQuery(undefined);
  const { data: monthlySales } = trpc.reports.monthlySales.useQuery(undefined);
  const { data: reorderAlerts } = trpc.inventory.reorderAlerts.useQuery(undefined);

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = (monthlySales || []).map((m: any) => ({
    month: monthLabels[m.month - 1],
    sales: parseFloat(m.totalSales) || 0,
    count: Number(m.count) || 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

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
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
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
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ${(stats?.totalProfit ?? 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                70% Pool: ${(stats?.investor70Pool ?? 0).toFixed(2)}
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
              <p className="text-xs text-muted-foreground">items in inventory</p>
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

      {/* Profit Split Summary */}
      {stats && (stats.totalProfit ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Profit Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Profit</span>
                  <span className="font-bold">${(stats.totalProfit ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Investor Pool (70%)</span>
                  <span className="font-bold text-green-400">${(stats.investor70Pool ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Master Share (30%)</span>
                  <span className="font-bold text-accent">${(stats.master30 ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reorder Alerts */}
          {reorderAlerts && reorderAlerts.length > 0 && (
            <Card className="bg-card border-border border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  Reorder Alerts ({reorderAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {reorderAlerts.slice(0, 5).map((alert: any) => (
                    <div key={alert.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Product #{alert.productId}</span>
                      <span className="text-yellow-400">
                        {alert.currentStock} / {alert.reorderLevel} units
                      </span>
                    </div>
                  ))}
                  {reorderAlerts.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{reorderAlerts.length - 5} more alerts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Monthly Sales Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Monthly Sales Trend ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No sales data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
    </div>
  );
}
