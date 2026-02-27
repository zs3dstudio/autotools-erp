/**
 * Phase-5: Daily Business Snapshots Viewer
 *
 * Shows automated midnight snapshots:
 * - Total sales & profit
 * - Branch performance ranking
 * - Low stock items
 * - Overdue payments
 * - Top products
 *
 * Admin can also manually trigger a snapshot for any date.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CalendarDays, TrendingUp, DollarSign, Package, AlertTriangle,
  RefreshCw, ChevronRight, Clock,
} from "lucide-react";
import { useState } from "react";

function fmt(n: any) {
  return `$${parseFloat(n ?? 0).toFixed(2)}`;
}

export default function DailySummaries() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [generateDate, setGenerateDate] = useState(new Date().toISOString().split("T")[0]);

  const utils = trpc.useUtils();

  const { data: summaries, isLoading } = trpc.dailySummary.list.useQuery({
    limit: 30,
  });

  const { data: selectedSummary } = trpc.dailySummary.byDate.useQuery(
    { date: selectedDate! },
    { enabled: !!selectedDate }
  );

  const generateMutation = trpc.dailySummary.generate.useMutation({
    onSuccess: (data) => {
      utils.dailySummary.list.invalidate();
      if (data.summary) {
        setSelectedDate(data.summary.summaryDate);
      }
      toast.success("Snapshot generated", { description: `Daily summary for ${generateDate} has been created.` });
    },
    onError: (err) => {
      toast.error("Generation failed", { description: err.message });
    },
  });

  const activeSummary = selectedSummary ?? (summaries?.[0] ?? null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Daily Snapshots
          </h1>
          <p className="text-muted-foreground mt-1">Automated midnight business summaries</p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Generate for date</Label>
            <Input
              type="date"
              value={generateDate}
              onChange={e => setGenerateDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() => generateMutation.mutate({ date: generateDate })}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: List of summaries */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">History</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
                ))}
              </div>
            ) : !summaries?.length ? (
              <p className="text-xs text-muted-foreground text-center py-6">No snapshots yet</p>
            ) : (
              <div className="space-y-1">
                {summaries.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedDate(s.summaryDate)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between ${
                      (selectedDate ?? summaries[0]?.summaryDate) === s.summaryDate
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-xs">{s.summaryDate}</p>
                      <p className="text-xs text-muted-foreground">{fmt(s.totalSales)}</p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main: Selected summary detail */}
        <div className="lg:col-span-3 space-y-4">
          {!activeSummary ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No snapshot selected. Generate one or select from history.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Date & Generated At */}
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{activeSummary.summaryDate}</h2>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activeSummary.generatedAt ? new Date(activeSummary.generatedAt).toLocaleTimeString() : "—"}
                </Badge>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="h-3.5 w-3.5 text-accent" />
                      <p className="text-xs text-muted-foreground">Total Sales</p>
                    </div>
                    <p className="text-xl font-bold text-accent">{fmt(activeSummary.totalSales)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      <p className="text-xs text-muted-foreground">Total Profit</p>
                    </div>
                    <p className="text-xl font-bold text-green-400">{fmt(activeSummary.totalProfit)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Package className="h-3.5 w-3.5 text-blue-400" />
                      <p className="text-xs text-muted-foreground">Transactions</p>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{activeSummary.totalTransactions}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Branch Performance Ranking */}
              {activeSummary.branchPerformance?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Branch Performance Ranking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeSummary.branchPerformance.map((b: any, i: number) => (
                        <div key={b.branchId ?? i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{b.branchName}</span>
                              <span className="text-accent font-bold">{fmt(b.totalSales)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                              <span>{b.transactionCount} transactions</span>
                              <span className="text-green-400">Profit: {fmt(b.totalProfit)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Low Stock Items */}
              {activeSummary.lowStockItems?.length > 0 && (
                <Card className="bg-yellow-500/5 border-yellow-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      Low Stock Items ({activeSummary.lowStockItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Reorder Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeSummary.lowStockItems.map((item: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                            <TableCell className="text-sm">{item.branchName}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={item.currentStock === 0 ? "bg-red-500" : "bg-yellow-500 text-black"}>
                                {item.currentStock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">{item.reorderLevel}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Overdue Payments */}
              {activeSummary.overduePayments?.length > 0 && (
                <Card className="bg-red-500/5 border-red-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      Overdue Payments ({activeSummary.overduePayments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeSummary.overduePayments.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{p.type}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-red-400 font-bold">{fmt(p.amount)}</p>
                            <p className="text-xs text-muted-foreground">{p.daysOverdue} days overdue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Products */}
              {activeSummary.topProducts?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Top Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeSummary.topProducts.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                            <span className="font-medium">{p.productName}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-accent font-bold">{fmt(p.totalRevenue)}</span>
                            <span className="text-xs text-muted-foreground ml-2">({p.unitsSold} units)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
