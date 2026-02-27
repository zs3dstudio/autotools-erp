import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    landingCost: "",
    branchCost: "",
    retailPrice: "",
    description: "",
    reorderLevel: "5",
  });

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery({
    search: search || undefined,
  });

  const addProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully");
      setFormData({ sku: "", name: "", landingCost: "", branchCost: "", retailPrice: "", description: "", reorderLevel: "5" });
      setShowAddForm(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add product");
    },
  });

  const handleAddProduct = () => {
    if (!formData.name || !formData.landingCost || !formData.branchCost || !formData.retailPrice) {
      toast.error("Please fill required fields: Name, Landing Cost, Branch Cost, Retail Price");
      return;
    }
    addProductMutation.mutate({
      sku: formData.sku || "AUTO-" + Date.now(),
      name: formData.name,
      landingCost: formData.landingCost,
      branchCost: formData.branchCost,
      retailPrice: formData.retailPrice,
      description: formData.description || undefined,
      reorderLevel: parseInt(formData.reorderLevel) || 5,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-accent" />
          <h1 className="text-3xl font-bold">Product Catalog</h1>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-accent">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">SKU</label>
                <Input
                  placeholder="Auto-generated if blank"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Product Name *</label>
                <Input
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Landing Cost *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.landingCost}
                  onChange={(e) => setFormData({ ...formData, landingCost: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Branch Cost *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.branchCost}
                  onChange={(e) => setFormData({ ...formData, branchCost: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Retail Price *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reorder Level</label>
                <Input
                  type="number"
                  placeholder="5"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddProduct} disabled={addProductMutation.isPending} className="bg-accent">
                {addProductMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
              <Button onClick={() => setShowAddForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">Loading products...</CardContent>
        </Card>
      ) : !products || products.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            No products found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Landing Cost</th>
                  <th className="text-left py-3 px-4 font-semibold">Branch Cost</th>
                  <th className="text-left py-3 px-4 font-semibold">Retail Price</th>
                  <th className="text-left py-3 px-4 font-semibold">Margin</th>
                  <th className="text-left py-3 px-4 font-semibold">Reorder At</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => {
                  const retail = parseFloat(p.retailPrice) || 0;
                  const landing = parseFloat(p.landingCost) || 0;
                  const margin = retail > 0 ? (((retail - landing) / retail) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-card/50">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="py-3 px-4 font-medium">{p.name}</td>
                      <td className="py-3 px-4">${landing.toFixed(2)}</td>
                      <td className="py-3 px-4">${parseFloat(p.branchCost || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-accent font-bold">${retail.toFixed(2)}</td>
                      <td className="py-3 px-4 text-green-400">{margin}%</td>
                      <td className="py-3 px-4 text-muted-foreground">{p.reorderLevel}</td>
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
