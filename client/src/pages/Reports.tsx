import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, BarChart2, Download } from "lucide-react";
import { exportMultiSheetExcel } from "@/lib/exportExcel";
import { toast } from "sonner";

const CHART_COLORS = [
  "oklch(0.65 0.2 45)",
  "oklch(0.65 0.2 200)",
  "oklch(0.65 0.2 130)",
  "oklch(0.65 0.2 300)",
];

export default function Reports() {
  const [branchId, setBranchId] = useState<number>(0);
  const { data: branches } = trpc.branches.list.useQuery();
  const { data: monthlySales } = trpc.reports.monthlySales.useQuery({ branchId: branchId || undefined });
  const { data: stats } = trpc.reports.dashboardStats.useQuery({ branchId: branchId || undefined });
  const { data: topProducts } = trpc.reports.topProducts.useQuery({ branchId: branchId || undefined });
  const { data: salesList } = trpc.reports.salesList.useQuery({ branchId: branchId || undefined });

  const handleExportExcel = () => {
    const branchLabel = branchId
      ? (branches?.find((b: any) => b.id === branchId)?.name ?? `Branch-${branchId}`)
      : "All-Branches";
    const dateStr = new Date().toISOString().split("T")[0];

    const monthlySalesData = (monthlySales ?? []).map((m: any) => ({
      Month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m.month - 1],
      "Total Sales ($)": parseFloat(m.totalSales) || 0,
      "Sales Count": Number(m.count) || 0,
    }));

    const topProductsData = (topProducts ?? []).map((p: any) => ({
      Product: p.productName,
      "Units Sold": Number(p.unitsSold) || 0,
      "Total Revenue ($)": parseFloat(p.totalRevenue) || 0,
      "Total Profit ($)": parseFloat(p.totalProfit) || 0,
    }));

    const salesData = (salesList ?? []).map((s: any) => ({
      "Receipt No": s.receiptNo,
      Date: new Date(s.createdAt).toLocaleDateString(),
      Customer: s.customerName || "—",
      Phone: s.customerPhone || "—",
      "Subtotal ($)": parseFloat(s.subtotal) || 0,
      "Discount ($)": parseFloat(s.discount) || 0,
      "Total ($)": parseFloat(s.totalAmount) || 0,
      "Payment Type": s.paymentType,
      Status: s.status,
    }));

    const summaryData = stats ? [{
      "Total Revenue ($)": stats.totalSales ?? 0,
      "Total Sales Count": stats.totalSalesCount ?? 0,
      "Total Profit ($)": stats.totalProfit ?? 0,
      "Investor Pool 70% ($)": stats.investor70Pool ?? 0,
      "Master Share 30% ($)": stats.master30 ?? 0,
      "Available Stock": stats.availableStock ?? 0,
      "Pending Transfers": stats.pendingTransfers ?? 0,
    }] : [];

    exportMultiSheetExcel(
      [
        { name: "Summary", data: summaryData },
        { name: "Monthly Sales", data: monthlySalesData },
        { name: "Top Products", data: topProductsData },
        { name: "Sales Transactions", data: salesData },
      ],
      `ERP-Report_${branchLabel}_${dateStr}`
    );
    toast.success("Report exported to Excel successfully");
  };

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = (monthlySales || []).map((m: any) => ({
    month: monthLabels[m.month - 1],
    sales: parseFloat(m.totalSales) || 0,
    count: Number(m.count) || 0,
  }));

  const profitData = stats
    ? [
        { name: "Investor Pool (70%)", value: stats.investor70Pool ?? 0 },
        { name: "Master Share (30%)", value: stats.master30 ?? 0 },
      ]
    : [];

  const topProductsData = (topProducts || []).map((p: any) => ({
    name: p.productName || `Product #${p.productId}`,
    units: Number(p.unitsSold) || 0,
    revenue: parseFloat(p.totalRevenue) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold">Sales Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-sm font-medium mr-2">Branch:</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(parseInt(e.target.value))}
              className="input-field"
            >
              <option value={0}>All Branches</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="flex items-center gap-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
          >
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-accent">${(stats.totalSales ?? 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{stats.totalSalesCount ?? 0} sales</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Total Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-400">${(stats.totalProfit ?? 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">After landing cost</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Investor Pool (70%)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-blue-400">${(stats.investor70Pool ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Master Share (30%)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-yellow-400">${(stats.master30 ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Sales Trend */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Monthly Sales Trend ({new Date().getFullYear()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No sales data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 250)" />
                <XAxis dataKey="month" stroke="oklch(0.65 0.05 250)" />
                <YAxis stroke="oklch(0.65 0.05 250)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "oklch(0.18 0.02 250)", border: "1px solid oklch(0.25 0.03 250)" }}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="oklch(0.65 0.2 45)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profit Split Pie */}
        {profitData.length > 0 && (stats?.totalProfit ?? 0) > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Profit Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={profitData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {profitData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.18 0.02 250)", border: "1px solid oklch(0.25 0.03 250)" }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Products */}
        {topProductsData.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Top Products by Units Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 250)" />
                  <XAxis type="number" stroke="oklch(0.65 0.05 250)" />
                  <YAxis dataKey="name" type="category" stroke="oklch(0.65 0.05 250)" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "oklch(0.18 0.02 250)", border: "1px solid oklch(0.25 0.03 250)" }}
                  />
                  <Bar dataKey="units" fill="oklch(0.65 0.2 200)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
