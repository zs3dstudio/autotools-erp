/**
 * Phase-5: Advanced Reports Page
 *
 * Reports available:
 * 1. Daily Sales Report (per branch / all branches)
 * 2. Monthly Revenue Report
 * 3. Profit Breakdown Report
 * 4. Supplier Payables Report
 * 5. Branch Outstanding Payments Report
 *
 * Features:
 * - Date range filters
 * - Branch filters
 * - Export to Excel (XLSX)
 * - Export to PDF (print-friendly)
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { FileText, Download, FileSpreadsheet, Printer, TrendingUp, DollarSign, Package } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: any) {
  return `$${parseFloat(n ?? 0).toFixed(2)}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function exportToExcel(data: any[], filename: string, sheetName = "Report") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToPDF(title: string, tableId: string) {
  const printContent = document.getElementById(tableId);
  if (!printContent) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p.meta { color: #666; font-size: 11px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f97316; color: white; padding: 6px 10px; text-align: left; font-size: 11px; }
          td { padding: 5px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) td { background: #f9f9f9; }
          .total-row td { font-weight: bold; background: #fff3e0; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Generated: ${new Date().toLocaleString()} · AutoTools ERP</p>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}

// ─── DAILY SALES REPORT ───────────────────────────────────────────────────────

function DailySalesReport() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [branchId, setBranchId] = useState<string>("all");

  const { data: branches } = trpc.branches.list.useQuery(undefined);
  const { data: sales, isLoading } = trpc.phase5Reports.dailySales.useQuery({
    from,
    to,
    branchId: branchId !== "all" ? parseInt(branchId) : undefined,
  });

  const totalSales = (sales || []).reduce((s: number, r: any) => s + parseFloat(r.totalAmount ?? 0), 0);
  const totalProfit = (sales || []).reduce((s: number, r: any) => s + parseFloat(r.totalProfit ?? 0), 0);

  const handleExcelExport = () => {
    exportToExcel(
      (sales || []).map((r: any) => ({
        "Receipt No": r.receiptNo,
        "Branch": r.branchName,
        "Customer": r.customerName ?? "—",
        "Date": new Date(r.createdAt).toLocaleDateString(),
        "Subtotal": parseFloat(r.subtotal).toFixed(2),
        "Discount": parseFloat(r.discount).toFixed(2),
        "Total": parseFloat(r.totalAmount).toFixed(2),
        "Profit": parseFloat(r.totalProfit ?? 0).toFixed(2),
        "Payment": r.paymentType,
      })),
      `daily-sales-${from}-to-${to}`,
      "Daily Sales"
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {(branches || []).map((b: any) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={!sales?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF("Daily Sales Report", "daily-sales-table")} disabled={!sales?.length}>
            <Printer className="h-4 w-4 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-muted/30"><CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-xl font-bold">{(sales || []).length}</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-accent">{fmt(totalSales)}</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Total Profit</p>
          <p className="text-xl font-bold text-green-400">{fmt(totalProfit)}</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <div id="daily-sales-table" className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !sales?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sales found for selected filters</TableCell></TableRow>
            ) : (
              <>
                {sales.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.receiptNo}</TableCell>
                    <TableCell>{r.branchName}</TableCell>
                    <TableCell>{r.customerName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.totalAmount)}</TableCell>
                    <TableCell className="text-right text-green-400">{fmt(r.totalProfit)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.paymentType}</Badge></TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={4}>TOTAL</TableCell>
                  <TableCell className="text-right text-accent">{fmt(totalSales)}</TableCell>
                  <TableCell className="text-right text-green-400">{fmt(totalProfit)}</TableCell>
                  <TableCell />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── PROFIT BREAKDOWN REPORT ──────────────────────────────────────────────────

function ProfitBreakdownReport() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const { data: report, isLoading } = trpc.phase5Reports.profitBreakdown.useQuery({ from, to });

  const summary = report?.summary ?? {};
  const branchBreakdown = report?.branchBreakdown ?? [];
  const investorDistribution = report?.investorDistribution ?? [];

  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      "Company Profit": parseFloat(summary.companyProfit ?? 0).toFixed(2),
      "Investor Pool (70%)": parseFloat(summary.investorPool ?? 0).toFixed(2),
      "Master Share (30%)": parseFloat(summary.masterShare ?? 0).toFixed(2),
      "Cash Due HO": parseFloat(summary.cashDueHO ?? 0).toFixed(2),
    }]), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      branchBreakdown.map((b: any) => ({
        "Branch": b.branchName,
        "Transactions": b.transactionCount,
        "Company Profit": parseFloat(b.companyProfit ?? 0).toFixed(2),
        "Investor Pool": parseFloat(b.investorPool ?? 0).toFixed(2),
        "Master Share": parseFloat(b.masterShare ?? 0).toFixed(2),
      }))
    ), "Branch Breakdown");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      investorDistribution.map((i: any) => ({
        "Investor": i.investorName,
        "Capital": parseFloat(i.totalCapital ?? 0).toFixed(2),
        "Share %": i.sharePercent,
        "Distribution": parseFloat(i.distributedAmount ?? 0).toFixed(2),
      }))
    ), "Investor Distribution");
    XLSX.writeFile(wb, `profit-breakdown-${from}-to-${to}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={handleExcelExport}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF("Profit Breakdown Report", "profit-breakdown-table")}>
            <Printer className="h-4 w-4 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Company Profit", value: summary.companyProfit, color: "text-accent" },
          { label: "Investor Pool (70%)", value: summary.investorPool, color: "text-orange-400" },
          { label: "Master Share (30%)", value: summary.masterShare, color: "text-yellow-400" },
          { label: "Cash Due HO", value: summary.cashDueHO, color: "text-blue-400" },
        ].map(item => (
          <Card key={item.label} className="bg-muted/30">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{fmt(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch Breakdown */}
      <div id="profit-breakdown-table">
        <h3 className="text-sm font-semibold mb-2">Branch Breakdown</h3>
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Company Profit</TableHead>
                <TableHead className="text-right">Investor Pool</TableHead>
                <TableHead className="text-right">Master Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : branchBreakdown.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No data</TableCell></TableRow>
              ) : branchBreakdown.map((b: any) => (
                <TableRow key={b.branchId}>
                  <TableCell className="font-medium">{b.branchName}</TableCell>
                  <TableCell className="text-right">{b.transactionCount}</TableCell>
                  <TableCell className="text-right text-accent">{fmt(b.companyProfit)}</TableCell>
                  <TableCell className="text-right text-orange-400">{fmt(b.investorPool)}</TableCell>
                  <TableCell className="text-right text-yellow-400">{fmt(b.masterShare)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Investor Distribution */}
        {investorDistribution.length > 0 && (
          <>
            <h3 className="text-sm font-semibold mt-4 mb-2">Investor Distribution</h3>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">Share %</TableHead>
                    <TableHead className="text-right">Distribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investorDistribution.map((inv: any) => (
                    <TableRow key={inv.investorId}>
                      <TableCell className="font-medium">{inv.investorName}</TableCell>
                      <TableCell className="text-right">{fmt(inv.totalCapital)}</TableCell>
                      <TableCell className="text-right">{parseFloat(inv.sharePercent ?? 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-accent font-bold">{fmt(inv.distributedAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SUPPLIER PAYABLES REPORT ─────────────────────────────────────────────────

function SupplierPayablesReport() {
  const { data: report, isLoading } = trpc.phase5Reports.supplierPayables.useQuery();
  const totalOutstanding = (report || []).reduce((s: number, r: any) => s + parseFloat(r.outstandingBalance ?? 0), 0);

  const handleExcelExport = () => {
    exportToExcel(
      (report || []).map((r: any) => ({
        "Supplier": r.supplierName,
        "Phone": r.supplierPhone ?? "—",
        "Email": r.supplierEmail ?? "—",
        "Total Purchases": parseFloat(r.totalPurchases ?? 0).toFixed(2),
        "Total Paid": parseFloat(r.totalPaid ?? 0).toFixed(2),
        "Outstanding Balance": parseFloat(r.outstandingBalance ?? 0).toFixed(2),
        "Last Transaction": r.lastTransactionDate ? new Date(r.lastTransactionDate).toLocaleDateString() : "—",
      })),
      "supplier-payables",
      "Supplier Payables"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Card className="bg-muted/30"><CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-xl font-bold text-red-400">{fmt(totalOutstanding)}</p>
          </CardContent></Card>
          <Card className="bg-muted/30"><CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Suppliers with Balance</p>
            <p className="text-xl font-bold">{(report || []).filter((r: any) => parseFloat(r.outstandingBalance) > 0).length}</p>
          </CardContent></Card>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={!report?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF("Supplier Payables Report", "supplier-payables-table")} disabled={!report?.length}>
            <Printer className="h-4 w-4 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      <div id="supplier-payables-table" className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Total Purchases</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Last Transaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !report?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No supplier data found</TableCell></TableRow>
            ) : (
              report.map((r: any) => (
                <TableRow key={r.supplierId}>
                  <TableCell className="font-medium">{r.supplierName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.supplierPhone ?? r.supplierEmail ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmt(r.totalPurchases)}</TableCell>
                  <TableCell className="text-right text-green-400">{fmt(r.totalPaid)}</TableCell>
                  <TableCell className="text-right">
                    <span className={parseFloat(r.outstandingBalance) > 0 ? "text-red-400 font-bold" : "text-green-400"}>
                      {fmt(r.outstandingBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{r.lastTransactionDate ? new Date(r.lastTransactionDate).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── BRANCH OUTSTANDING REPORT ────────────────────────────────────────────────

function BranchOutstandingReport() {
  const { data: report, isLoading } = trpc.phase5Reports.branchOutstanding.useQuery();
  const totalPending = (report || []).reduce((s: number, r: any) => s + parseFloat(r.totalPending ?? 0), 0);

  const handleExcelExport = () => {
    exportToExcel(
      (report || []).map((r: any) => ({
        "Branch": r.branchName,
        "Pending Payments": r.pendingCount,
        "Total Pending": parseFloat(r.totalPending ?? 0).toFixed(2),
        "Latest Payment Date": r.latestPaymentDate ? new Date(r.latestPaymentDate).toLocaleDateString() : "—",
      })),
      "branch-outstanding-payments",
      "Branch Outstanding"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Card className="bg-muted/30"><CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Total Pending from Branches</p>
          <p className="text-xl font-bold text-yellow-400">{fmt(totalPending)}</p>
        </CardContent></Card>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={!report?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF("Branch Outstanding Payments", "branch-outstanding-table")} disabled={!report?.length}>
            <Printer className="h-4 w-4 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      <div id="branch-outstanding-table" className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Pending Payments</TableHead>
              <TableHead className="text-right">Total Pending</TableHead>
              <TableHead>Latest Submission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !report?.length ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending payments found</TableCell></TableRow>
            ) : (
              report.map((r: any) => (
                <TableRow key={r.branchId}>
                  <TableCell className="font-medium">{r.branchName}</TableCell>
                  <TableCell className="text-right">{r.pendingCount}</TableCell>
                  <TableCell className="text-right text-yellow-400 font-bold">{fmt(r.totalPending)}</TableCell>
                  <TableCell className="text-xs">{r.latestPaymentDate ? new Date(r.latestPaymentDate).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── MONTHLY REVENUE REPORT ───────────────────────────────────────────────────

function MonthlyRevenueReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [branchId, setBranchId] = useState<string>("all");
  const { data: branches } = trpc.branches.list.useQuery(undefined);
  const { data: report, isLoading } = trpc.phase5Reports.monthlyRevenue.useQuery({
    year,
    branchId: branchId !== "all" ? parseInt(branchId) : undefined,
  });

  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const totalRevenue = (report || []).reduce((s: number, r: any) => s + parseFloat(r.totalRevenue ?? 0), 0);
  const totalProfit = (report || []).reduce((s: number, r: any) => s + parseFloat(r.totalProfit ?? 0), 0);

  const handleExcelExport = () => {
    exportToExcel(
      (report || []).map((r: any) => ({
        "Month": MONTH_LABELS[(r.month - 1)] ?? r.month,
        "Year": r.year ?? year,
        "Transactions": r.transactionCount,
        "Revenue": parseFloat(r.totalRevenue ?? 0).toFixed(2),
        "Profit": parseFloat(r.totalProfit ?? 0).toFixed(2),
      })),
      `monthly-revenue-${year}`,
      "Monthly Revenue"
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Year</Label>
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {(branches || []).map((b: any) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={!report?.length}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF("Monthly Revenue Report", "monthly-revenue-table")} disabled={!report?.length}>
            <Printer className="h-4 w-4 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-muted/30"><CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Annual Revenue</p>
          <p className="text-xl font-bold text-accent">{fmt(totalRevenue)}</p>
        </CardContent></Card>
        <Card className="bg-muted/30"><CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">Annual Profit</p>
          <p className="text-xl font-bold text-green-400">{fmt(totalProfit)}</p>
        </CardContent></Card>
      </div>

      <div id="monthly-revenue-table" className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !report?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data for {year}</TableCell></TableRow>
            ) : (
              <>
                {report.map((r: any) => {
                  const rev = parseFloat(r.totalRevenue ?? 0);
                  const prof = parseFloat(r.totalProfit ?? 0);
                  const margin = rev > 0 ? ((prof / rev) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{MONTH_LABELS[(r.month - 1)] ?? r.month}</TableCell>
                      <TableCell className="text-right">{r.transactionCount}</TableCell>
                      <TableCell className="text-right text-accent">{fmt(rev)}</TableCell>
                      <TableCell className="text-right text-green-400">{fmt(prof)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{margin}%</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{(report || []).reduce((s: number, r: any) => s + Number(r.transactionCount ?? 0), 0)}</TableCell>
                  <TableCell className="text-right text-accent">{fmt(totalRevenue)}</TableCell>
                  <TableCell className="text-right text-green-400">{fmt(totalProfit)}</TableCell>
                  <TableCell className="text-right">{totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0"}%</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdvancedReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Advanced Reports
          </h1>
          <p className="text-muted-foreground mt-1">Downloadable business reports with date range and branch filters</p>
        </div>
      </div>

      <Tabs defaultValue="daily-sales">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="daily-sales" className="text-xs">
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Daily Sales
          </TabsTrigger>
          <TabsTrigger value="monthly-revenue" className="text-xs">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Monthly Revenue
          </TabsTrigger>
          <TabsTrigger value="profit-breakdown" className="text-xs">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Profit Breakdown
          </TabsTrigger>
          <TabsTrigger value="supplier-payables" className="text-xs">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Supplier Payables
          </TabsTrigger>
          <TabsTrigger value="branch-outstanding" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Branch Outstanding
          </TabsTrigger>
        </TabsList>

        <Card className="bg-card border-border mt-4">
          <CardContent className="pt-6">
            <TabsContent value="daily-sales"><DailySalesReport /></TabsContent>
            <TabsContent value="monthly-revenue"><MonthlyRevenueReport /></TabsContent>
            <TabsContent value="profit-breakdown"><ProfitBreakdownReport /></TabsContent>
            <TabsContent value="supplier-payables"><SupplierPayablesReport /></TabsContent>
            <TabsContent value="branch-outstanding"><BranchOutstandingReport /></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Fix missing import
function ShoppingCart(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.className?.includes("h-3.5") ? 14 : 16} height={props.className?.includes("h-3.5") ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  );
}
