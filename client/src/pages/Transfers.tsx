import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, Plus, PackageCheck, Truck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Transfers() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    fromBranchId: 0,
    toBranchId: 0,
    itemSerials: "",
    notes: "",
  });
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: transfers, isLoading, refetch } = trpc.transfers.list.useQuery({});
  const { data: branches } = trpc.branches.list.useQuery();

  const createTransferMutation = trpc.transfers.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Transfer created: ${data.transferNo}`);
      setFormData({ fromBranchId: 0, toBranchId: 0, itemSerials: "", notes: "" });
      setShowCreateForm(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create transfer");
    },
  });

  const approveMutation = trpc.transfers.approve.useMutation({
    onSuccess: () => {
      toast.success("Transfer approved and items marked as InTransit");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve transfer");
    },
  });

  const rejectMutation = trpc.transfers.reject.useMutation({
    onSuccess: () => {
      toast.success("Transfer rejected");
      setRejectId(null);
      setRejectReason("");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject transfer");
    },
  });

  const completeMutation = trpc.transfers.complete.useMutation({
    onSuccess: () => {
      toast.success("Transfer completed — items received at destination branch");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete transfer");
    },
  });

  const handleCreateTransfer = () => {
    if (!formData.fromBranchId || !formData.toBranchId || !formData.itemSerials.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    if (formData.fromBranchId === formData.toBranchId) {
      toast.error("From and To branches must be different");
      return;
    }
    const serials = formData.itemSerials
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (serials.length === 0) {
      toast.error("Enter at least one serial number");
      return;
    }
    // Items will be resolved by serial on the backend
    const items = serials.map((serialNo) => ({
      serialNo,
      inventoryItemId: 0, // resolved server-side
      productId: 0,       // resolved server-side
    }));
    createTransferMutation.mutate({
      fromBranchId: formData.fromBranchId,
      toBranchId: formData.toBranchId,
      notes: formData.notes || undefined,
      items,
    } as any);
  };

  const handleReject = () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({ id: rejectId, reason: rejectReason });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
      case "InTransit":
        return <Truck className="w-5 h-5 text-blue-400" />;
      case "Completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "Rejected":
      case "Cancelled":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "text-green-400";
      case "InTransit":
      case "Approved": return "text-blue-400";
      case "Rejected":
      case "Cancelled": return "text-red-400";
      default: return "text-yellow-400";
    }
  };

  const getBranchName = (id: number) => branches?.find((b: any) => b.id === id)?.name || `Branch #${id}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Stock Transfers</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-accent">
          <Plus className="w-4 h-4 mr-2" /> Create Transfer
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Create Stock Transfer Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">From Branch *</label>
                <select
                  value={formData.fromBranchId}
                  onChange={(e) => setFormData({ ...formData, fromBranchId: parseInt(e.target.value) })}
                  className="input-field w-full"
                >
                  <option value={0}>Select Branch</option>
                  {branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">To Branch *</label>
                <select
                  value={formData.toBranchId}
                  onChange={(e) => setFormData({ ...formData, toBranchId: parseInt(e.target.value) })}
                  className="input-field w-full"
                >
                  <option value={0}>Select Branch</option>
                  {branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Serial Numbers * (comma-separated)</label>
              <Input
                placeholder="SN-001, SN-002, SN-003"
                value={formData.itemSerials}
                onChange={(e) => setFormData({ ...formData, itemSerials: e.target.value })}
                className="input-field"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Items must be Available and belong to the From Branch
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Optional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateTransfer}
                disabled={createTransferMutation.isPending}
                className="bg-accent"
              >
                {createTransferMutation.isPending ? "Creating..." : "Create Transfer"}
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Reason Dialog */}
      {rejectId !== null && (
        <Card className="bg-card border-border border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Reject Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Input
                placeholder="Provide a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                variant="destructive"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
              </Button>
              <Button onClick={() => { setRejectId(null); setRejectReason(""); }} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">Loading transfers...</CardContent>
        </Card>
      ) : !transfers || transfers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">No transfers found</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transfers.map((t: any) => (
            <Card key={t.id} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(t.status)}
                    <div>
                      <p className="font-bold text-lg">{t.transferNo}</p>
                      <p className="text-sm text-muted-foreground">
                        {getBranchName(t.fromBranchId)} → {getBranchName(t.toBranchId)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(t.status)}`}>{t.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.requestedAt || t.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {t.notes && (
                  <p className="text-sm text-muted-foreground mb-3 italic">"{t.notes}"</p>
                )}

                {t.rejectionReason && (
                  <div className="mb-3 p-2 bg-red-500/10 rounded border border-red-500/20">
                    <p className="text-xs text-red-400">Rejection reason: {t.rejectionReason}</p>
                  </div>
                )}

                {user?.role === "admin" && t.status === "Pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => approveMutation.mutate({ id: t.id })}
                      disabled={approveMutation.isPending}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      onClick={() => setRejectId(t.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {t.status === "InTransit" && (
                  <div className="mt-3">
                    <Button
                      onClick={() => completeMutation.mutate({ id: t.id })}
                      disabled={completeMutation.isPending}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <PackageCheck className="w-4 h-4 mr-1" />
                      {completeMutation.isPending ? "Confirming..." : "Mark as Received"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
