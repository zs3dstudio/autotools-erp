import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { DollarSign, Plus, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function Ledger() {
  const [branchId, setBranchId] = useState<number | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
  });

  const { data: branches } = trpc.branches.list.useQuery();

  // Only query when a branch is selected (branchId is required by the router)
  const { data: entries, isLoading, refetch } = trpc.ledger.entries.useQuery(
    { branchId: branchId! },
    { enabled: !!branchId }
  );
  const { data: summary } = trpc.ledger.summary.useQuery(
    { branchId: branchId! },
    { enabled: !!branchId }
  );

  const addExpenseMutation = trpc.ledger.addExpense.useMutation({
    onSuccess: () => {
      toast.success("Expense recorded");
      setExpenseForm({ category: "", description: "", amount: "" });
      setShowExpenseForm(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add expense");
    },
  });

  const handleAddExpense = () => {
    if (!branchId) {
      toast.error("Select a branch first");
      return;
    }
    if (!expenseForm.category || !expenseForm.amount) {
      toast.error("Category and amount are required");
      return;
    }
    addExpenseMutation.mutate({
      branchId,
      category: expenseForm.category,
      description: expenseForm.description || undefined,
      amount: expenseForm.amount,
      expenseDate: new Date(),
    });
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case "Sale": return "text-green-400";
      case "Expense": return "text-red-400";
      case "Payment": return "text-orange-400";
      case "Adjustment": return "text-yellow-400";
      case "Transfer": return "text-blue-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold">Financial Ledger</h1>
        </div>
        {branchId && (
          <Button onClick={() => setShowExpenseForm(!showExpenseForm)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Select Branch *</label>
        <select
          value={branchId ?? ""}
          onChange={(e) => setBranchId(e.target.value ? parseInt(e.target.value) : null)}
          className="input-field w-full max-w-xs mt-1"
        >
          <option value="">— Select a branch —</option>
          {branches?.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {!branchId && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a branch to view its ledger
          </CardContent>
        </Card>
      )}

      {branchId && showExpenseForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" /> Record Expense
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Category *</label>
                <Input
                  placeholder="e.g. Rent, Utilities"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Optional"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddExpense}
                disabled={addExpenseMutation.isPending}
                variant="destructive"
              >
                {addExpenseMutation.isPending ? "Saving..." : "Record Expense"}
              </Button>
              <Button onClick={() => setShowExpenseForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {branchId && summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" /> Total Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">
                ${(summary.totalSales || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Sales & payments received</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-400" /> Total Debits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">
                ${(summary.totalExpenses || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Expenses & payments out</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" /> Net Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${(summary.balance || 0) >= 0 ? "text-accent" : "text-red-400"}`}>
                ${(summary.balance || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Credits minus debits</p>
            </CardContent>
          </Card>
        </div>
      )}

      {branchId && (
        isLoading ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-muted-foreground">Loading ledger entries...</CardContent>
          </Card>
        ) : !entries || entries.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              No ledger entries for this branch yet
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-right py-3 px-4 font-semibold">Debit</th>
                    <th className="text-right py-3 px-4 font-semibold">Credit</th>
                    <th className="text-right py-3 px-4 font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e: any) => (
                    <tr key={e.id} className="border-b border-border hover:bg-card/50">
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${getEntryTypeColor(e.entryType)}`}>
                          {e.entryType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm max-w-xs truncate">{e.description}</td>
                      <td className="py-3 px-4 text-right text-red-400">
                        {parseFloat(e.debit) > 0 ? `$${parseFloat(e.debit).toFixed(2)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-green-400">
                        {parseFloat(e.credit) > 0 ? `$${parseFloat(e.credit).toFixed(2)}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ${parseFloat(e.runningBalance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
