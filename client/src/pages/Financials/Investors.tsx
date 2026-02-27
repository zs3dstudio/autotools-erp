/**
 * Investors — Phase-4 Financial Control Layer
 * Manage investors, capital contributions, and view capital share percentages.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Plus, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";

function fmt(n: number | string | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function InvestorRow({ investor, totalCapital }: { investor: any; totalCapital: number }) {
  const [expanded, setExpanded] = useState(false);
  const [addCapitalOpen, setAddCapitalOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", contributionDate: new Date().toISOString().split("T")[0], notes: "" });
  const utils = trpc.useUtils();

  const history = trpc.financials.investors.capitalHistory.useQuery(
    { investorId: investor.id },
    { enabled: expanded }
  );

  const addCapital = trpc.financials.investors.addCapital.useMutation({
    onSuccess: () => {
      toast.success("Capital contribution recorded");
      setAddCapitalOpen(false);
      setForm({ amount: "", contributionDate: new Date().toISOString().split("T")[0], notes: "" });
      utils.financials.investors.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const capital = parseFloat(investor.totalCapital ?? "0");
  const sharePercent = totalCapital > 0 ? ((capital / totalCapital) * 100).toFixed(1) : "0.0";

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="font-medium">{investor.name}</p>
            {investor.contactInfo && (
              <p className="text-xs text-muted-foreground">{investor.contactInfo}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold">{fmt(capital)}</p>
            <p className="text-xs text-muted-foreground">{sharePercent}% of total capital</p>
          </div>
          <Dialog open={addCapitalOpen} onOpenChange={setAddCapitalOpen}>
            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Capital
              </Button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Add Capital — {investor.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
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
                    <Label>Contribution Date *</Label>
                    <Input
                      type="date"
                      value={form.contributionDate}
                      onChange={(e) => setForm(f => ({ ...f, contributionDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. Second round investment" className="mt-1" rows={2}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!form.amount || addCapital.isPending}
                  onClick={() => addCapital.mutate({
                    investorId: investor.id,
                    amount: form.amount,
                    contributionDate: form.contributionDate,
                    notes: form.notes || undefined,
                  })}
                >
                  {addCapital.isPending ? "Recording..." : "Record Contribution"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/10">
          {history.isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !history.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No contributions yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 text-muted-foreground">{new Date(c.contributionDate).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-semibold text-emerald-500">{fmt(c.amount)}</td>
                    <td className="p-3 text-muted-foreground">{c.notes ?? "—"}</td>
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

function NewInvestorDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contactInfo: "" });
  const utils = trpc.useUtils();

  const create = trpc.financials.investors.create.useMutation({
    onSuccess: () => {
      toast.success("Investor created successfully");
      setOpen(false);
      setForm({ name: "", contactInfo: "" });
      utils.financials.investors.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Investor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Investor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Investor Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name or company name" className="mt-1"
            />
          </div>
          <div>
            <Label>Contact Information</Label>
            <Textarea
              value={form.contactInfo}
              onChange={(e) => setForm(f => ({ ...f, contactInfo: e.target.value }))}
              placeholder="Email, phone, address..." className="mt-1" rows={2}
            />
          </div>
          <Button
            className="w-full"
            disabled={!form.name.trim() || create.isPending}
            onClick={() => create.mutate({ name: form.name, contactInfo: form.contactInfo || undefined })}
          >
            {create.isPending ? "Creating..." : "Create Investor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InvestorsPage() {
  const investors = trpc.financials.investors.list.useQuery();

  const totalCapital = investors.data?.reduce(
    (sum: number, i: any) => sum + parseFloat(i.totalCapital ?? "0"), 0
  ) ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage investors, capital contributions, and share percentages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">Phase-4</Badge>
          <NewInvestorDialog />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Capital Pool</p>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{fmt(totalCapital)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Investors</p>
            <p className="text-2xl font-bold mt-1">{investors.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Investor Pool Split</p>
            </div>
            <p className="text-sm mt-2 text-muted-foreground">
              70% of company profit distributed proportionally by capital share
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investor list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investors & Capital Contributions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {investors.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !investors.data?.length ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No investors yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add investors to enable profit distribution</p>
            </div>
          ) : (
            investors.data.map((inv: any) => (
              <InvestorRow key={inv.id} investor={inv} totalCapital={totalCapital} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
