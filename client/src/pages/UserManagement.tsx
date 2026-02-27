/**
 * User Management Page — Phase-3
 * SuperAdmin and Admin can add, edit, and manage users.
 * Role selector, branch assignment, and permission toggles.
 */
import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Building2,
  UserCheck,
  UserX,
  Key,
} from "lucide-react";
import { toast } from "sonner";

type UserRole = "SuperAdmin" | "Admin" | "BranchManager" | "POSUser";

type PermissionFlags = {
  canSell: boolean;
  canTransferRequest: boolean;
  canReceiveStock: boolean;
  canViewLedger: boolean;
  canViewGlobalStock: boolean;
  canViewFinancials: boolean;
};

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId: number | null;
  isActive: boolean;
  permissions: PermissionFlags;
};

const defaultPermissions: PermissionFlags = {
  canSell: false,
  canTransferRequest: false,
  canReceiveStock: false,
  canViewLedger: false,
  canViewGlobalStock: false,
  canViewFinancials: false,
};

const rolePermissionDefaults: Record<UserRole, PermissionFlags> = {
  SuperAdmin: { canSell: true, canTransferRequest: true, canReceiveStock: true, canViewLedger: true, canViewGlobalStock: true, canViewFinancials: true },
  Admin: { canSell: true, canTransferRequest: true, canReceiveStock: true, canViewLedger: true, canViewGlobalStock: true, canViewFinancials: true },
  BranchManager: { canSell: true, canTransferRequest: true, canReceiveStock: true, canViewLedger: true, canViewGlobalStock: false, canViewFinancials: false },
  POSUser: { canSell: true, canTransferRequest: false, canReceiveStock: false, canViewLedger: false, canViewGlobalStock: false, canViewFinancials: false },
};

const ROLE_LABELS: Record<UserRole, string> = {
  SuperAdmin: "Super Admin",
  Admin: "Admin (HO)",
  BranchManager: "Branch Manager",
  POSUser: "POS User",
};

const ROLE_COLORS: Record<UserRole, string> = {
  SuperAdmin: "bg-red-500/10 text-red-500 border-red-500/20",
  Admin: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  BranchManager: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  POSUser: "bg-green-500/10 text-green-500 border-green-500/20",
};

const emptyForm: UserFormData = {
  name: "",
  email: "",
  password: "",
  role: "POSUser",
  branchId: null,
  isActive: true,
  permissions: rolePermissionDefaults.POSUser,
};

export default function UserManagement() {
  const { isAdmin, isSuperAdmin, user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: branches } = trpc.branches.list.useQuery({ includeInactive: false });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      utils.users.list.invalidate();
      closeDialog();
    },
    onError: (err) => setFormError(err.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      utils.users.list.invalidate();
      closeDialog();
    },
    onError: (err) => setFormError(err.message),
  });

  const updatePermsMutation = trpc.users.updatePermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissions updated");
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowPassword(false);
    setShowPermissions(false);
    setShowDialog(true);
  };

  const openEdit = (user: any) => {
    setEditingId(user.id);
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      role: user.role ?? "POSUser",
      branchId: user.branchId ?? null,
      isActive: Boolean(user.isActive),
      permissions: user.permissions ?? rolePermissionDefaults[user.role as UserRole] ?? defaultPermissions,
    });
    setFormError(null);
    setShowPassword(false);
    setShowPermissions(true);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowPermissions(false);
  };

  // Auto-fill permissions when role changes
  const handleRoleChange = (role: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: rolePermissionDefaults[role] ?? defaultPermissions,
      // Clear branch for global roles
      branchId: (role === "SuperAdmin" || role === "Admin") ? null : prev.branchId,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    if (!editingId && !form.password.trim()) {
      setFormError("Password is required for new users.");
      return;
    }
    if (!editingId && form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if ((form.role === "BranchManager" || form.role === "POSUser") && !form.branchId) {
      setFormError("Branch assignment is required for this role.");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        userId: editingId,
        name: form.name,
        email: form.email,
        role: form.role,
        branchId: form.branchId,
        isActive: form.isActive,
        newPassword: form.password || undefined,
      });
      // Also update permissions
      updatePermsMutation.mutate({ userId: editingId, permissions: form.permissions });
    } else {
      createMutation.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        branchId: form.branchId,
        permissions: form.permissions,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const needsBranch = form.role === "BranchManager" || form.role === "POSUser";

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["SuperAdmin", "Admin", "BranchManager", "POSUser"] as UserRole[]).map((role) => (
          <Card key={role}>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">
                {users?.filter((u: any) => u.role === role).length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user: any) => (
                  <TableRow key={user.id} className={!user.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ROLE_COLORS[user.role as UserRole] ?? "bg-muted text-muted-foreground"}`}>
                        {ROLE_LABELS[user.role as UserRole] ?? user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.branchName ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {user.branchName}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">All Branches</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.isActive ? (
                          <><UserCheck className="h-3 w-3 text-green-500" /><span className="text-xs text-green-500">Active</span></>
                        ) : (
                          <><UserX className="h-3 w-3 text-destructive" /><span className="text-xs text-destructive">Disabled</span></>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.canSell && <Badge variant="outline" className="text-xs">Sell</Badge>}
                        {user.permissions?.canTransferRequest && <Badge variant="outline" className="text-xs">Transfer</Badge>}
                        {user.permissions?.canViewLedger && <Badge variant="outline" className="text-xs">Ledger</Badge>}
                        {user.permissions?.canViewFinancials && <Badge variant="outline" className="text-xs">Finance</Badge>}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                          className="gap-1"
                          disabled={user.role === "SuperAdmin" && !isSuperAdmin}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Add/Edit User Dialog */}
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {editingId ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogDescription>
            {editingId ? "Update user details, role, and permissions." : "Create a new user with role and branch assignment."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name *</Label>
              <Input
                id="user-name"
                placeholder="John Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email Address *</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                {editingId ? "New Password (leave blank to keep current)" : "Password *"}
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={editingId ? "Leave blank to keep current" : "Min. 6 characters"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Role & Branch */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Role & Branch Assignment
            </h4>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => handleRoleChange(v as UserRole)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && (
                    <SelectItem value="SuperAdmin">
                      <span className="flex items-center gap-2">
                        <span className="text-red-500">●</span> Super Admin (Full Control)
                      </span>
                    </SelectItem>
                  )}
                  <SelectItem value="Admin">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-500">●</span> Admin — HO Operations
                    </span>
                  </SelectItem>
                  <SelectItem value="BranchManager">
                    <span className="flex items-center gap-2">
                      <span className="text-purple-500">●</span> Branch Manager — Own Branch
                    </span>
                  </SelectItem>
                  <SelectItem value="POSUser">
                    <span className="flex items-center gap-2">
                      <span className="text-green-500">●</span> POS User — Sales Only
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsBranch && (
              <div className="space-y-2">
                <Label>Branch Assignment *</Label>
                <Select
                  value={form.branchId?.toString() ?? ""}
                  onValueChange={(v) => setForm({ ...form, branchId: v ? parseInt(v) : null })}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {b.name} {b.city ? `— ${b.city}` : ""}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingId && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Account Active</p>
                  <p className="text-xs text-muted-foreground">Disable to prevent login</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  disabled={isPending}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Permission Flags
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPermissions(!showPermissions)}
                className="text-xs"
              >
                {showPermissions ? "Hide" : "Customize"}
              </Button>
            </div>

            {showPermissions && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                {(Object.keys(form.permissions) as (keyof PermissionFlags)[]).map((key) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium">{permissionLabel(key)}</p>
                      <p className="text-xs text-muted-foreground">{permissionDescription(key)}</p>
                    </div>
                    <Switch
                      checked={form.permissions[key]}
                      onCheckedChange={(v) => setForm({
                        ...form,
                        permissions: { ...form.permissions, [key]: v },
                      })}
                      disabled={isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

function permissionLabel(key: keyof PermissionFlags): string {
  const labels: Record<keyof PermissionFlags, string> = {
    canSell: "Can Sell",
    canTransferRequest: "Can Request Transfers",
    canReceiveStock: "Can Receive Stock",
    canViewLedger: "Can View Ledger",
    canViewGlobalStock: "Can View Global Stock",
    canViewFinancials: "Can View Financials",
  };
  return labels[key];
}

function permissionDescription(key: keyof PermissionFlags): string {
  const desc: Record<keyof PermissionFlags, string> = {
    canSell: "Create sales at POS",
    canTransferRequest: "Request stock transfers between branches",
    canReceiveStock: "Receive and add inventory items",
    canViewLedger: "View branch ledger and expenses",
    canViewGlobalStock: "View stock across all branches",
    canViewFinancials: "View profit, costs, and financial reports",
  };
  return desc[key];
}
