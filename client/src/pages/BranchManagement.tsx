/**
 * Branch Management Page — Phase-3
 * SuperAdmin and Admin can add, edit, and disable branches.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Plus,
  Pencil,
  MapPin,
  Phone,
  Warehouse,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type BranchFormData = {
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  isWarehouse: boolean;
};

const emptyForm: BranchFormData = {
  name: "",
  code: "",
  city: "",
  address: "",
  phone: "",
  isWarehouse: false,
};

export default function BranchManagement() {
  const { isAdmin } = useAuth();
  const utils = trpc.useUtils();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BranchFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<{ id: number; name: string; active: boolean } | null>(null);

  const { data: branches, isLoading } = trpc.branches.list.useQuery({ includeInactive: true });

  const createMutation = trpc.branches.create.useMutation({
    onSuccess: () => {
      toast.success("Branch created successfully");
      utils.branches.list.invalidate();
      closeDialog();
    },
    onError: (err) => setFormError(err.message),
  });

  const updateMutation = trpc.branches.update.useMutation({
    onSuccess: () => {
      toast.success("Branch updated successfully");
      utils.branches.list.invalidate();
      closeDialog();
    },
    onError: (err) => setFormError(err.message),
  });

  const setStatusMutation = trpc.branches.setStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Branch ${vars.isActive ? "enabled" : "disabled"}`);
      utils.branches.list.invalidate();
      setConfirmDisable(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowDialog(true);
  };

  const openEdit = (branch: any) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name ?? "",
      code: branch.code ?? "",
      city: branch.city ?? "",
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      isWarehouse: Boolean(branch.isWarehouse),
    });
    setFormError(null);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Branch name and code are required.");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Branch Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage branches, locations, and stock points
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{branches?.length ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {branches?.filter((b: any) => b.isActive).length ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">
              {branches?.filter((b: any) => b.isWarehouse).length ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Warehouses</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Branches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches?.map((branch: any) => (
                  <TableRow key={branch.id} className={!branch.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{branch.code}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[branch.city, branch.address].filter(Boolean).join(", ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {branch.phone ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {branch.phone}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {branch.isWarehouse ? (
                        <Badge variant="secondary" className="gap-1">
                          <Warehouse className="h-3 w-3" />
                          Warehouse
                        </Badge>
                      ) : (
                        <Badge variant="outline">Branch</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.isActive ? "default" : "destructive"}>
                        {branch.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(branch)}
                            className="gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant={branch.isActive ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => setConfirmDisable({ id: branch.id, name: branch.name, active: branch.isActive })}
                            className={branch.isActive ? "text-destructive hover:text-destructive" : "text-green-600"}
                          >
                            {branch.isActive ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {branches?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No branches found. Add your first branch to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Add/Edit Branch Dialog */}
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          <DialogDescription>
            {editingId ? "Update branch details below." : "Fill in the branch information to create a new location."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                placeholder="e.g., Main Branch"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-code">Branch Code *</Label>
              <Input
                id="branch-code"
                placeholder="e.g., MAIN"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={isPending || Boolean(editingId)}
                maxLength={16}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-city">City</Label>
              <Input
                id="branch-city"
                placeholder="e.g., Karachi"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="branch-address">Address</Label>
              <Input
                id="branch-address"
                placeholder="Street address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="branch-phone">Phone</Label>
              <Input
                id="branch-phone"
                placeholder="+92-300-0000000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Warehouse</p>
                <p className="text-xs text-muted-foreground">Mark as a warehouse/stock point (not a sales branch)</p>
              </div>
              <Switch
                checked={form.isWarehouse}
                onCheckedChange={(v) => setForm({ ...form, isWarehouse: v })}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Save Changes" : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Confirm Disable/Enable Dialog */}
    <Dialog open={Boolean(confirmDisable)} onOpenChange={() => setConfirmDisable(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {confirmDisable?.active ? "Disable Branch" : "Enable Branch"}
          </DialogTitle>
          <DialogDescription>
            {confirmDisable?.active
              ? `Disabling "${confirmDisable?.name}" will prevent all sales and operations at this branch.`
              : `Enabling "${confirmDisable?.name}" will allow operations to resume at this branch.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDisable(null)}>
            Cancel
          </Button>
          <Button
            variant={confirmDisable?.active ? "destructive" : "default"}
            onClick={() => confirmDisable && setStatusMutation.mutate({ id: confirmDisable.id, isActive: !confirmDisable.active })}
            disabled={setStatusMutation.isPending}
          >
            {setStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {confirmDisable?.active ? "Disable" : "Enable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
