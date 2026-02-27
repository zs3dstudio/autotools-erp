/**
 * Supplier Ledger — Phase-4 Financial Control Layer
 * View supplier outstanding balances and full transaction history.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DollarSign, TrendingDown, TrendingUp, Plus, ChevronDown, ChevronRight } from "lucide-react";

function fmt(n: number | string | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function SupplierRow({ supplier }: { supplier: any }) {
  const [expanded, setExpanded] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const ledger = trpc.financials.supplierLedger.getLedger.useQuery(
    { supplierId: supplier.supplierId },
    { enabled: expanded }
  );

  const recordPayment = trpc.financials.supplierLedger.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setPayDialogOpen(false);
      setPayAmount("");
    },
    onError: (e) => toast.error(e.message),
  });

  const balance = parseFloat(supplier.outstandingBalance ?? "0");

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Summary row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="font-medium">{supplier.supplierName ?? `Supplier ${supplier.supplierId}`}</p>
            <p className="text-xs text-muted-foreground">
              Total Purchased: {fmt(supplier.totalDebit)} · Total Paid: {fmt(supplier.totalCredit)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={balance > 0 ? "destructive" : "secondary"} className="text-sm font-semibold">
            {fmt(balance)} {balance > 0 ? "owed" : "settled"}
          </Badge>
          {balance > 0 && (
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
              <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Record Payment to {supplier.supplierName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Outstanding Balance</Label>
                    <p className="text-lg font-bold text-destructive mt-1">{fmt(balance)}</p>
                  </div>
                  <div>
                    <Label htmlFor="pay-amount">Payment Amount</Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={balance}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!payAmount || parseFloat(payAmount) <= 0 || recordPayment.isPending}
                    onClick={() =>
                      recordPayment.mutate({
                        supplierId: supplier.supplierId,
                        amount: payAmount,
                        referenceId: 0,
                      })
                    }
                  >
                    {recordPayment.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Expanded ledger */}
      {expanded && (
        <div className="border-t bg-muted/10">
          {ledger.isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !ledger.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Debit</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Credit</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.data.map((entry: any) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 text-muted-foreground">
                      {new Date(entry.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Badge variant={entry.transactionType === "Purchase" ? "outline" : "secondary"} className="text-xs">
                        {entry.transactionType === "Purchase" ? (
                          <><TrendingDown className="h-3 w-3 mr-1 text-destructive" /> Purchase</>
                        ) : (
                          <><TrendingUp className="h-3 w-3 mr-1 text-emerald-500" /> Payment</>
                        )}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-destructive font-medium">
                      {parseFloat(entry.debit) > 0 ? fmt(entry.debit) : "—"}
                    </td>
                    <td className="p-3 text-right text-emerald-500 font-medium">
                      {parseFloat(entry.credit) > 0 ? fmt(entry.credit) : "—"}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {fmt(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function SupplierLedgerPage() {
  const balances = trpc.financials.supplierLedger.getAllBalances.useQuery();

  const totalOutstanding = balances.data?.reduce(
    (sum: number, s: any) => sum + parseFloat(s.outstandingBalance ?? "0"), 0
  ) ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track outstanding balances and payment history for all suppliers
          </p>
        </div>
        <Badge variant="outline" className="text-xs">Phase-4</Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className={`text-2xl font-bold mt-1 ${totalOutstanding > 0 ? "text-destructive" : "text-emerald-500"}`}>
              {fmt(totalOutstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Purchased</p>
            <p className="text-2xl font-bold mt-1">
              {fmt(balances.data?.reduce((s: number, r: any) => s + parseFloat(r.totalDebit ?? "0"), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold mt-1 text-emerald-500">
              {fmt(balances.data?.reduce((s: number, r: any) => s + parseFloat(r.totalCredit ?? "0"), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supplier list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {balances.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !balances.data?.length ? (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No supplier transactions yet</p>
            </div>
          ) : (
            balances.data.map((s: any) => <SupplierRow key={s.supplierId} supplier={s} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
