import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Receipt,
  Plus,
  DollarSign,
  TrendingDown,
  Calendar,
  Tag,
  X,
  Check,
  Filter,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Maintenance",
  "Supplies",
  "Transport",
  "Insurance",
  "Taxes",
  "Other",
];

interface ExpenseForm {
  branchId: number;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
}

const emptyForm: ExpenseForm = {
  branchId: 0,
  category: "",
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().split("T")[0],
};

export default function Expenses() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [filterBranchId, setFilterBranchId] = useState<number>(0);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data: branches } = trpc.branches.list.useQuery();
  const { data: expenses, refetch } = trpc.expenses.list.useQuery({
    branchId: filterBranchId || undefined,
    from: filterFrom ? new Date(filterFrom) : undefined,
    to: filterTo ? new Date(filterTo + "T23:59:59") : undefined,
  });
  const { data: summary } = trpc.expenses.summary.useQuery({
    branchId: filterBranchId || undefined,
    from: filterFrom ? new Date(filterFrom) : undefined,
    to: filterTo ? new Date(filterTo + "T23:59:59") : undefined,
  });

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense recorded successfully");
      setShowForm(false);
      setForm(emptyForm);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to record expense"),
  });

  const handleSubmit = () => {
    if (!form.branchId) {
      toast.error("Please select a branch");
      return;
    }
    if (!form.category) {
      toast.error("Please select a category");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    createMutation.mutate({
      branchId: form.branchId,
      category: form.category,
      description: form.description || undefined,
      amount: form.amount,
      expenseDate: new Date(form.expenseDate),
    });
  };

  const categoryColors: Record<string, string> = {
    Rent: "text-blue-400",
    Utilities: "text-yellow-400",
    Salaries: "text-green-400",
    Marketing: "text-purple-400",
    Maintenance: "text-orange-400",
    Supplies: "text-cyan-400",
    Transport: "text-pink-400",
    Insurance: "text-indigo-400",
    Taxes: "text-red-400",
    Other: "text-gray-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-7 h-7 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Expense Tracking</h1>
            <p className="text-sm text-muted-foreground">Monitor and record branch expenses</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" /> Record Expense
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <Filter className="w-3 h-3 inline mr-1" /> Branch
              </label>
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(parseInt(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={0}>All Branches</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-9 w-36"
              />
            </div>
            {(filterFrom || filterTo || filterBranchId > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterBranchId(0); }}
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-red-400">
              ${(summary?.total ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{summary?.count ?? 0} records</p>
          </CardContent>
        </Card>
        {summary?.byCategory && Object.entries(summary.byCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cat, amount]) => (
            <Card key={cat} className="bg-card border-border">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{cat}</p>
                <p className={`text-2xl font-bold ${categoryColors[cat] ?? "text-accent"}`}>
                  ${(amount as number).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Category Breakdown */}
      {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" /> Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.byCategory)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([cat, amount]) => {
                  const pct = summary.total > 0 ? ((amount as number) / summary.total) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-medium ${categoryColors[cat] ?? "text-accent"}`}>{cat}</span>
                        <span className="text-muted-foreground">
                          ${(amount as number).toFixed(2)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" /> Expense Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!expenses || expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No expenses recorded</p>
              <p className="text-sm mt-1">Record your first expense to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Category</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Description</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Branch</th>
                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: any) => (
                    <tr key={expense.id} className="border-b border-border/50 hover:bg-background/50">
                      <td className="py-3 px-2">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`font-medium ${categoryColors[expense.category] ?? "text-accent"}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground max-w-xs truncate">
                        {expense.description || "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {branches?.find((b: any) => b.id === expense.branchId)?.name ?? `Branch #${expense.branchId}`}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-red-400">
                        -${parseFloat(String(expense.amount)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={4} className="py-3 px-2 font-semibold">Total</td>
                    <td className="py-3 px-2 text-right font-bold text-red-400">
                      -${(summary?.total ?? 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Expense Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" /> Record New Expense
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Branch *</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm((p) => ({ ...p, branchId: parseInt(e.target.value) }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={0}>Select Branch</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select Category</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional details..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount ($) *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expense Date *</label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                <Check className="w-4 h-4 mr-2" />
                {createMutation.isPending ? "Recording..." : "Record Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
