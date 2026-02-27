import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, Save, Palette, Receipt } from "lucide-react";

export default function CompanySettings() {
  const { data: settings, refetch } = trpc.companySettings.get.useQuery();
  const updateMutation = trpc.companySettings.update.useMutation({
    onSuccess: () => {
      toast.success("Company settings saved successfully");
      refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to save settings"),
  });

  const [form, setForm] = useState({
    companyName: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    currency: "USD",
    currencySymbol: "$",
    logoUrl: "",
    primaryColor: "#f97316",
    taxRate: "0.00",
    receiptFooter: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName ?? "",
        tagline: settings.tagline ?? "",
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        website: settings.website ?? "",
        currency: settings.currency ?? "USD",
        currencySymbol: settings.currencySymbol ?? "$",
        logoUrl: settings.logoUrl ?? "",
        primaryColor: settings.primaryColor ?? "#f97316",
        taxRate: settings.taxRate ?? "0.00",
        receiptFooter: settings.receiptFooter ?? "",
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Company Settings</h1>
            <p className="text-sm text-muted-foreground">Manage branding and business configuration</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-accent hover:bg-accent/90">
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Branding */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Business Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Company Name *</label>
            <Input
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              placeholder="AutoTools ERP"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tagline</label>
            <Input
              value={form.tagline}
              onChange={(e) => handleChange("tagline", e.target.value)}
              placeholder="Your trusted auto tools partner"
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Business Ave, City, Country"
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="info@company.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Website</label>
            <Input
              value={form.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://www.company.com"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Logo URL</label>
            <Input
              value={form.logoUrl}
              onChange={(e) => handleChange("logoUrl", e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding & Appearance */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" /> Appearance & Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-2 mt-1 items-center">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="h-10 w-14 rounded border border-input cursor-pointer bg-background"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                placeholder="#f97316"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Currency Code</label>
            <Input
              value={form.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              placeholder="USD"
              maxLength={8}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Currency Symbol</label>
            <Input
              value={form.currencySymbol}
              onChange={(e) => handleChange("currencySymbol", e.target.value)}
              placeholder="$"
              maxLength={8}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tax Rate (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.taxRate}
              onChange={(e) => handleChange("taxRate", e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Receipt Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium">Receipt Footer Message</label>
            <textarea
              value={form.receiptFooter}
              onChange={(e) => handleChange("receiptFooter", e.target.value)}
              placeholder="Thank you for your purchase! Returns accepted within 7 days."
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Preview */}
          {(form.companyName || form.receiptFooter) && (
            <div className="mt-4 p-4 border border-dashed border-border rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Receipt Preview</p>
              <div className="text-center space-y-1">
                {form.logoUrl && (
                  <img src={form.logoUrl} alt="Logo" className="h-12 mx-auto object-contain mb-2" onError={(e) => (e.currentTarget.style.display = "none")} />
                )}
                <p className="font-bold text-lg">{form.companyName || "Company Name"}</p>
                {form.tagline && <p className="text-xs text-muted-foreground">{form.tagline}</p>}
                {form.address && <p className="text-xs text-muted-foreground">{form.address}</p>}
                {form.phone && <p className="text-xs text-muted-foreground">{form.phone}</p>}
                <div className="border-t border-dashed border-border my-2" />
                {form.receiptFooter && (
                  <p className="text-xs text-muted-foreground italic">{form.receiptFooter}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-accent hover:bg-accent/90">
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
