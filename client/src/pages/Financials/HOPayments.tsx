/**
 * HO Payments — Phase-4 Financial Control Layer
 * Branch → Head Office payment request submission and admin approval workflow.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Plus, Building2 } from "lucide-react";

function fmt(n: number | string | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

const STATUS_CONFIG = {
  Pending: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", icon: Clock },
  Approved: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  Rejected: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
};

function PaymentCard({ payment, isAdmin }: { payment: any; isAdmin: boolean }) {
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const approve = trpc.financials.hoPayments.approve.useMutation({
    onSuccess: () => {
      toast.success("Payment approved and ledger entry created");
      utils.financials.hoPayments.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reject = trpc.financials.hoPayments.reject.useMutation({
    onSuccess: () => {
      toast.success("Payment request rejected");
      setRejectDialogOpen(false);
      utils.financials.hoPayments.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cfg = STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.Pending;
  const Icon = cfg.icon;

  return (
    <div className={`border rounded-lg p-4 ${payment.status === "Pending" ? "border-yellow-500/20 bg-yellow-500/5" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{payment.branchName ?? `Branch ${payment.branchId}`}</span>
            <Badge className={`text-xs border ${cfg.color}`}>
              <Icon className="h-3 w-3 mr-1" />
              {payment.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-2">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold">{fmt(payment.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Method</p>
              <p>{payment.paymentMethod ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono text-xs">{payment.reference ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p>{new Date(payment.paymentDate).toLocaleDateString()}</p>
            </div>
          </div>
          {payment.notes && (
            <p className="text-xs text-muted-foreground mt-1">Note: {payment.notes}</p>
          )}
          {payment.rejectionReason && (
            <p className="text-xs text-destructive mt-1">Rejection reason: {payment.rejectionReason}</p>
          )}
        </div>

        {/* Admin actions for pending payments */}
        {isAdmin && payment.status === "Pending" && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
              disabled={approve.isPending}
              onClick={() => approve.mutate({ paymentId: payment.id })}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Payment Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      You are rejecting a payment of <strong>{fmt(payment.amount)}</strong> from{" "}
                      <strong>{payment.branchName}</strong>.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="reject-reason">Rejection Reason *</Label>
                    <Textarea
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain why this payment is being rejected..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!rejectReason.trim() || reject.isPending}
                    onClick={() => reject.mutate({ paymentId: payment.id, rejectionReason: rejectReason })}
                  >
                    {reject.isPending ? "Rejecting..." : "Confirm Rejection"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

function NewPaymentDialog({ branches }: { branches: any[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    branchId: "",
    amount: "",
    paymentMethod: "Bank Transfer",
    reference: "",
    notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });
  const utils = trpc.useUtils();

  const submit = trpc.financials.hoPayments.request.useMutation({
    onSuccess: () => {
      toast.success("Payment request submitted for approval");
      setOpen(false);
      setForm({ branchId: "", amount: "", paymentMethod: "Bank Transfer", reference: "", notes: "", paymentDate: new Date().toISOString().split("T")[0] });
      utils.financials.hoPayments.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Submit Payment to HO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Payment to Head Office</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Branch *</Label>
            <Select value={form.branchId} onValueChange={(v) => setForm(f => ({ ...f, branchId: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number" step="0.01" min="0.01"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" className="mt-1"
              />
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm(f => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Bank Transfer", "Cash", "Cheque", "Online Transfer"].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference / Transaction ID</Label>
            <Input
              value={form.reference}
              onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="TXN-2025-001" className="mt-1"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..." className="mt-1" rows={2}
            />
          </div>
          <Button
            className="w-full"
            disabled={!form.branchId || !form.amount || submit.isPending}
            onClick={() => submit.mutate({
              branchId: parseInt(form.branchId),
              amount: form.amount,
              paymentMethod: form.paymentMethod,
              reference: form.reference || undefined,
              notes: form.notes || undefined,
              paymentDate: form.paymentDate,
            })}
          >
            {submit.isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HOPaymentsPage() {
  const { isAdmin } = useAuth();
  const allPayments = trpc.financials.hoPayments.list.useQuery(undefined);
  const branches = trpc.branches.list.useQuery({ includeInactive: false });

  const pending = allPayments.data?.filter((p: any) => p.status === "Pending") ?? [];
  const approved = allPayments.data?.filter((p: any) => p.status === "Approved") ?? [];
  const rejected = allPayments.data?.filter((p: any) => p.status === "Rejected") ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HO Payment Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Branch → Head Office payment requests and approval workflow
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">Phase-4</Badge>
          <NewPaymentDialog branches={branches.data ?? []} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-yellow-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <p className="text-2xl font-bold text-yellow-500 mt-1">{pending.length}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{approved.length}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
            <p className="text-2xl font-bold text-destructive mt-1">{rejected.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment list by status */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pending.length > 0 && <Badge className="ml-1 bg-yellow-500/20 text-yellow-500 text-xs">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {(["pending", "approved", "rejected", "all"] as const).map((tab) => {
          const items = tab === "pending" ? pending : tab === "approved" ? approved : tab === "rejected" ? rejected : (allPayments.data ?? []);
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  {allPayments.isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">No {tab === "all" ? "" : tab} payments</p>
                  ) : (
                    items.map((p: any) => (
                      <PaymentCard key={p.id} payment={p} isAdmin={isAdmin} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
