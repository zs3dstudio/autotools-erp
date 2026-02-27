/**
 * Phase-5: Business Analytics Dashboard (Admin only)
 *
 * Widgets:
 * - Best selling products chart
 * - Branch performance comparison
 * - Monthly revenue trend
 * - Monthly profit trend
 * - Top customers
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, DollarSign, Package, Users, BarChart3, Award,
} from "lucide-react";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BRANCH_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#14b8a6"];

function fmt(n: any) {
  return `$${parseFloat(n ?? 0).toFixed(2)}`;
}

export default function AnalyticsDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.reports.dashboardStats.useQuery(undefined);
  const { data: monthlySales } = trpc.reports.monthlySales.useQuery(undefined);
  const { data: topProducts } = trpc.reports.topProducts.useQuery(undefined);
  const { data: branchPerf } = trpc.phase5Reports.branchPerformance.useQuery(undefined);
  const { data: monthlyRevenue } = trpc.phase5Reports.monthlyRevenue.useQuery(undefined);
  const { data: topCustomers } = trpc.phase5Reports.topCustomers.useQuery({ limit: 5 });
  const { data: profitBreakdown } = trpc.phase5Reports.profitBreakdown.useQuery(undefined);

  // Monthly revenue chart data
  const revenueChartData = (monthlyRevenue || monthlySales || []).map((m: any) => ({
    month: MONTH_LABELS[(m.month - 1)] ?? `M${m.month}`,
    revenue: parseFloat(m.totalRevenue ?? m.totalSales ?? 0),
    profit: parseFloat(m.totalProfit ?? 0),
    transactions: Number(m.transactionCount ?? m.count ?? 0),
  }));

  // Top products chart data
  const productsChartData = (topProducts || []).slice(0, 8).map((p: any) => ({
    name: p.productName?.length > 16 ? p.productName.slice(0, 14) + "…" : p.productName,
    units: Number(p.unitsSold),
    revenue: parseFloat(p.totalRevenue ?? 0),
  }));

  // Branch performance chart data
  const branchChartData = (branchPerf || []).map((b: any) => ({
    name: b.branchName?.length > 12 ? b.branchName.slice(0, 10) + "…" : b.branchName,
    sales: parseFloat(b.totalSales ?? 0),
    profit: parseFloat(b.totalProfit ?? b.companyProfit ?? 0),
    transactions: Number(b.transactionCount ?? 0),
  }));

  // Profit distribution pie data
  const profitSummary = profitBreakdown?.summary ?? {};
  const pieData = [
    { name: "Investor Pool (70%)", value: parseFloat(profitSummary.investorPool ?? 0) },
    { name: "Master Share (30%)", value: parseFloat(profitSummary.masterShare ?? 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Business Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Real-time business intelligence dashboard</p>
        </div>
        <Badge variant="outline" className="text-xs">Admin Only</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{fmt(stats?.totalSales)}</div>
            <p className="text-xs text-muted-foreground">{stats?.totalSalesCount ?? 0} transactions</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{fmt(stats?.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Investor Pool: {fmt(stats?.investor70Pool)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Branches</CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{branchChartData.length}</div>
            <p className="text-xs text-muted-foreground">Generating revenue</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Share</CardTitle>
            <Award className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{fmt(stats?.master30)}</div>
            <p className="text-xs text-muted-foreground">30% of company profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue & Profit Trend */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Monthly Revenue & Profit Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, ""]} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Best Selling Products + Profit Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Best Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No sales data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productsChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="units" fill="#f97316" name="Units Sold" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Profit Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No profit data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#f97316" : "#3b82f6"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? "#f97316" : "#3b82f6" }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-medium">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Comparison */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Branch Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branchChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">No branch data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={branchChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`$${parseFloat(v).toFixed(2)}`, ""]} />
                <Legend />
                <Bar dataKey="sales" fill="#f97316" name="Total Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#22c55e" name="Total Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Customers + Investor Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!topCustomers || topCustomers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No customer purchase data available</div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((c: any, i: number) => (
                  <div key={c.customerId ?? i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.customerName}</p>
                        <p className="text-xs text-muted-foreground">{c.purchaseCount} purchases</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-accent">{fmt(c.totalSpent)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Investor Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profitBreakdown?.investorDistribution || profitBreakdown.investorDistribution.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No investor data available</div>
            ) : (
              <div className="space-y-3">
                {profitBreakdown.investorDistribution.map((inv: any, i: number) => (
                  <div key={inv.investorId ?? i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{inv.investorName}</span>
                      <span className="text-accent font-bold">{fmt(inv.distributedAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${Math.min(parseFloat(inv.sharePercent ?? 0), 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{parseFloat(inv.sharePercent ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
