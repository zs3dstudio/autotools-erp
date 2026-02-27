import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  UserX,
  DollarSign,
  X,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const emptyForm: CustomerForm = { name: "", phone: "", email: "", address: "", notes: "" };

export default function Customers() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(null);

  const { data: customers, refetch } = trpc.customers.list.useQuery({ search: search || undefined });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Customer created successfully");
      setShowForm(false);
      setForm(emptyForm);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create customer"),
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Customer updated successfully");
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update customer"),
  });

  const deactivateMutation = trpc.customers.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Customer deactivated");
      setConfirmDeactivate(null);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to deactivate customer"),
  });

  const handleOpenCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleOpenEdit = (customer: any) => {
    setEditId(customer.id);
    setForm({
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground">Manage customer profiles and purchase history</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold text-accent">{customers?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Purchases</p>
            <p className="text-2xl font-bold text-green-400">
              ${(customers ?? []).reduce((sum: number, c: any) => sum + parseFloat(c.totalPurchases || "0"), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg. Purchase Value</p>
            <p className="text-2xl font-bold text-blue-400">
              ${customers && customers.length > 0
                ? ((customers ?? []).reduce((sum: number, c: any) => sum + parseFloat(c.totalPurchases || "0"), 0) / customers.length).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {!customers || customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No customers found</p>
              <p className="text-sm mt-1">Add your first customer to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer: any) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-accent font-semibold text-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" /> {customer.email}
                          </span>
                        )}
                        {customer.address && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" /> {customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Total Purchases</p>
                      <p className="font-semibold text-green-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {parseFloat(customer.totalPurchases || "0").toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(customer)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeactivate(customer.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="123 Main St, City"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="flex-1 bg-accent hover:bg-accent/90">
                <Check className="w-4 h-4 mr-2" />
                {isPending ? "Saving..." : editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm Dialog */}
      <Dialog open={confirmDeactivate !== null} onOpenChange={(open) => { if (!open) setConfirmDeactivate(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate Customer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to deactivate this customer? They will no longer appear in the active customer list.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeactivate(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeactivate && deactivateMutation.mutate({ id: confirmDeactivate })}
              disabled={deactivateMutation.isPending}
              className="flex-1"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
