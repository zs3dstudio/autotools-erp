import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Plus, Package } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    serialNo: "",
    productId: 0,
    branchId: 0,
    landingCost: "",
    branchCost: "",
  });

  const { data: items, isLoading, refetch } = trpc.inventory.list.useQuery({
    search: search || undefined,
    branchId: branchId || undefined,
  });

  const { data: branches } = trpc.branches.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();

  const addItemMutation = trpc.inventory.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item added successfully");
      setFormData({ serialNo: "", productId: 0, branchId: 0, landingCost: "", branchCost: "" });
      setShowAddForm(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add item");
    },
  });

  const handleAddItem = () => {
    if (!formData.serialNo || !formData.productId || !formData.branchId) {
      toast.error("Please fill all required fields");
      return;
    }
    addItemMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Available: "badge-success",
      Sold: "badge-danger",
      InTransit: "badge-warning",
      Reserved: "badge-info",
      Damaged: "badge-danger",
    };
    return colors[status] || "badge-info";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-accent text-accent-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Add Inventory Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Serial Number *</label>
                <Input
                  value={formData.serialNo}
                  onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                  placeholder="SN-001"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Product *</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: parseInt(e.target.value) })}
                  className="input-field w-full"
                >
                  <option value={0}>Select Product</option>
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Branch *</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: parseInt(e.target.value) })}
                  className="input-field w-full"
                >
                  <option value={0}>Select Branch</option>
                  {branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Landing Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.landingCost}
                  onChange={(e) => setFormData({ ...formData, landingCost: e.target.value })}
                  placeholder="0.00"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Branch Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.branchCost}
                  onChange={(e) => setFormData({ ...formData, branchCost: e.target.value })}
                  placeholder="0.00"
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddItem} disabled={addItemMutation.isPending} className="bg-accent">
                {addItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search serial number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={branchId || ""}
          onChange={(e) => setBranchId(e.target.value ? parseInt(e.target.value) : null)}
          className="input-field w-48"
        >
          <option value="">All Branches</option>
          {branches?.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8">Loading inventory...</CardContent>
        </Card>
      ) : items?.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            No items found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Serial No</th>
                  <th className="text-left py-3 px-4 font-semibold">Product</th>
                  <th className="text-left py-3 px-4 font-semibold">Branch</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Landing Cost</th>
                  <th className="text-left py-3 px-4 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item: any) => {
                  const product = products?.find((p: any) => p.id === item.productId);
                  const branch = branches?.find((b: any) => b.id === item.branchId);
                  return (
                  <tr key={item.id} className="border-b border-border hover:bg-card/50">
                    <td className="py-3 px-4 font-mono text-accent">{item.serialNo}</td>
                    <td className="py-3 px-4">{product?.name || "Unknown"}</td>
                    <td className="py-3 px-4">{branch?.name || "Unknown"}</td>
                    <td className="py-3 px-4">
                      <span className={`${getStatusBadge(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="py-3 px-4">${parseFloat(item.landingCost).toFixed(2)}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
