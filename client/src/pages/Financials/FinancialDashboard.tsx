/**
 * Financial Dashboard — Phase-4 Financial Control Layer
 * Overview of company profit, branch performance, supplier balances, and pending payments.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, DollarSign, Building2, Users, AlertTriangle,
  CheckCircle2, Clock, ArrowRight, BarChart3,
} from "lucide-react";
import { useLocation } from "wouter";

function StatCard({
  title, value, subtitle, icon: Icon, color = "text-primary", loading,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color?: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted/50`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(n: number | string | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function FinancialDashboard() {
  const { can } = useAuth();
  const [, setLocation] = useLocation();

  const profitSummary = trpc.financials.profit.companySummary.useQuery(undefined, {
    enabled: !!can.viewFinancials,
  });
  const branchSummary = trpc.financials.profit.branchSummary.useQuery(undefined, {
    enabled: !!can.viewFinancials,
  });
  const supplierBalances = trpc.financials.supplierLedger.getAllBalances.useQuery(undefined, {
    enabled: !!can.viewFinancials,
  });
  const pendingPayments = trpc.financials.hoPayments.list.useQuery({ status: "Pending" }, {
    enabled: !!can.viewFinancials,
  });
  const investors = trpc.financials.investors.list.useQuery(undefined, {
    enabled: !!can.viewFinancials,
  });

  const totalSupplierDebt = supplierBalances.data?.reduce(
    (sum: number, s: any) => sum + parseFloat(s.outstandingBalance ?? "0"), 0
  ) ?? 0;

  const totalInvestorCapital = investors.data?.reduce(
    (sum: number, i: any) => sum + parseFloat(i.totalCapital ?? "0"), 0
  ) ?? 0;

  const p = profitSummary.data;
  const loading = profitSummary.isLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Company-wide financial overview — profit, supplier balances, and payment status
          </p>
        </div>
        <Badge variant="outline" className="text-xs">Phase-4 Financial Control</Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Company Profit"
          value={fmt(p?.totalCompanyProfit)}
          subtitle="All time, all branches"
          icon={TrendingUp}
          color="text-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Investor Pool (70%)"
          value={fmt(p?.totalInvestorPool)}
          subtitle="Distributed to investors"
          icon={Users}
          color="text-blue-500"
          loading={loading}
        />
        <StatCard
          title="Master Share (30%)"
          value={fmt(p?.totalMasterShare)}
          subtitle="Head office master share"
          icon={BarChart3}
          color="text-purple-500"
          loading={loading}
        />
        <StatCard
          title="Total Revenue"
          value={fmt(p?.totalRevenue)}
          subtitle="Gross sales revenue"
          icon={DollarSign}
          color="text-primary"
          loading={loading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Supplier Outstanding"
          value={fmt(totalSupplierDebt)}
          subtitle="Total owed to suppliers"
          icon={AlertTriangle}
          color={totalSupplierDebt > 0 ? "text-orange-500" : "text-emerald-500"}
          loading={supplierBalances.isLoading}
        />
        <StatCard
          title="Pending HO Payments"
          value={pendingPayments.data?.length ?? 0}
          subtitle="Awaiting admin approval"
          icon={Clock}
          color={pendingPayments.data?.length ? "text-yellow-500" : "text-emerald-500"}
          loading={pendingPayments.isLoading}
        />
        <StatCard
          title="Total Investor Capital"
          value={fmt(totalInvestorCapital)}
          subtitle={`${investors.data?.length ?? 0} active investors`}
          icon={Users}
          color="text-cyan-500"
          loading={investors.isLoading}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Profit Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Branch Profit Breakdown</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/financials/supplier-ledger")}>
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {branchSummary.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !branchSummary.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No branch data available</p>
            ) : (
              <div className="space-y-3">
                {branchSummary.data.map((branch: any) => (
                  <div key={branch.branchId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{branch.branchName ?? `Branch ${branch.branchId}`}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-500">{fmt(branch.totalCompanyProfit)}</p>
                      <p className="text-xs text-muted-foreground">{branch.itemCount} items sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Supplier Outstanding Balances</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/financials/supplier-ledger")}>
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {supplierBalances.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !supplierBalances.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No supplier balances</p>
            ) : (
              <div className="space-y-3">
                {supplierBalances.data.map((s: any) => (
                  <div key={s.supplierId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{s.supplierName ?? `Supplier ${s.supplierId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Purchased: {fmt(s.totalDebit)} · Paid: {fmt(s.totalCredit)}
                      </p>
                    </div>
                    <Badge variant={parseFloat(s.outstandingBalance) > 0 ? "destructive" : "secondary"} className="text-xs">
                      {fmt(s.outstandingBalance)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending HO Payments */}
      {(pendingPayments.data?.length ?? 0) > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <CardTitle className="text-base font-semibold">Pending HO Payment Approvals</CardTitle>
              <Badge className="bg-yellow-500/10 text-yellow-500 text-xs">{pendingPayments.data?.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/financials/ho-payments")}>
              Review All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingPayments.data?.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <div>
                    <p className="text-sm font-medium">{p.branchName ?? `Branch ${p.branchId}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paymentMethod} · Ref: {p.reference ?? "—"} · {new Date(p.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(p.amount)}</p>
                    <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setLocation("/financials/ho-payments")}>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs">Approve Payments</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setLocation("/financials/supplier-ledger")}>
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Supplier Ledger</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setLocation("/financials/investors")}>
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-xs">Manage Investors</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setLocation("/financials/distribution")}>
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              <span className="text-xs">Profit Distribution</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
