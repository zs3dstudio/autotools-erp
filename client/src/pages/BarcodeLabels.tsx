import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  QrCode,
  Printer,
  Plus,
  Trash2,
  Search,
  Package,
  Tag,
  Settings2,
} from "lucide-react";
// import JsBarcode from "jsbarcode"; // Phase-1 dependency

interface LabelItem {
  id: string;
  barcode: string;
  name: string;
  sku: string;
  price: string;
  copies: number;
}

interface LabelSettings {
  width: number;
  height: number;
  fontSize: number;
  showPrice: boolean;
  showSku: boolean;
  showName: boolean;
  format: "CODE128" | "EAN13" | "UPC" | "CODE39";
}

const DEFAULT_SETTINGS: LabelSettings = {
  width: 200,
  height: 80,
  fontSize: 10,
  showPrice: true,
  showSku: true,
  showName: true,
  format: "CODE128",
};

function BarcodeLabel({ item, settings }: { item: LabelItem; settings: LabelSettings }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && item.barcode) {
      try {
        // Stub implementation - JsBarcode not available
        console.warn("Barcode generation requires 'jsbarcode' package");
        // In production, install jsbarcode and uncomment:
        // JsBarcode(svgRef.current, item.barcode, {
        //   format: settings.format,
        //   width: 1.5,
        //   height: 40,
        //   displayValue: true,
        //   fontSize: 10,
        //   margin: 4,
        //   background: "#ffffff",
        //   lineColor: "#000000",
        // });
      } catch (e) {
        // Invalid barcode for selected format — silently ignore
      }
    }
  }, [item.barcode, settings.format]);

  return (
    <div
      className="border border-gray-300 bg-white text-black p-2 flex flex-col items-center gap-1 print-label"
      style={{ width: `${settings.width}px`, minHeight: `${settings.height}px`, fontSize: `${settings.fontSize}px` }}
    >
      {settings.showName && (
        <p className="font-bold text-center leading-tight truncate w-full text-center" style={{ fontSize: `${settings.fontSize + 1}px` }}>
          {item.name}
        </p>
      )}
      {item.barcode ? (
        <svg ref={svgRef} className="max-w-full" />
      ) : (
        <div className="text-xs text-gray-400 italic">No barcode</div>
      )}
      <div className="flex gap-3 text-xs">
        {settings.showSku && <span className="text-gray-600">SKU: {item.sku}</span>}
        {settings.showPrice && item.price && (
          <span className="font-bold">${parseFloat(item.price).toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}

export default function BarcodeLabels() {
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [customBarcode, setCustomBarcode] = useState("");
  const [customName, setCustomName] = useState("");

  const { data: products } = trpc.products.list.useQuery(
    { search: search || undefined },
    { enabled: search.length >= 2 }
  );

  const addProductLabel = (product: any) => {
    const existing = labelItems.find((l) => l.id === `product-${product.id}`);
    if (existing) {
      setLabelItems((prev) =>
        prev.map((l) => l.id === `product-${product.id}` ? { ...l, copies: l.copies + 1 } : l)
      );
      toast.success(`Increased copies for ${product.name}`);
      return;
    }
    setLabelItems((prev) => [
      ...prev,
      {
        id: `product-${product.id}`,
        barcode: product.barcode || product.sku || String(product.id),
        name: product.name,
        sku: product.sku,
        price: product.retailPrice,
        copies: 1,
      },
    ]);
    toast.success(`Added label for ${product.name}`);
    setSearch("");
  };

  const addCustomLabel = () => {
    if (!customBarcode.trim()) {
      toast.error("Enter a barcode value");
      return;
    }
    const id = `custom-${Date.now()}`;
    setLabelItems((prev) => [
      ...prev,
      {
        id,
        barcode: customBarcode.trim(),
        name: customName.trim() || customBarcode.trim(),
        sku: customBarcode.trim(),
        price: "",
        copies: 1,
      },
    ]);
    setCustomBarcode("");
    setCustomName("");
    toast.success("Custom label added");
  };

  const removeLabel = (id: string) => {
    setLabelItems((prev) => prev.filter((l) => l.id !== id));
  };

  const updateCopies = (id: string, copies: number) => {
    if (copies < 1) return;
    setLabelItems((prev) => prev.map((l) => l.id === id ? { ...l, copies } : l));
  };

  const handlePrint = () => {
    if (labelItems.length === 0) {
      toast.error("Add at least one label to print");
      return;
    }
    window.print();
  };

  const totalLabels = labelItems.reduce((sum, l) => sum + l.copies, 0);

  return (
    <>
    {/* Print styles */}
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
        #barcode-print-area {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          padding: 8px !important;
          background: white !important;
        }
        .print-label {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      }
    `}</style>

    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QrCode className="w-7 h-7 text-accent" />
          <div>
            <h1 className="text-3xl font-bold">Barcode Labels</h1>
            <p className="text-sm text-muted-foreground">Generate and print product barcode labels</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" /> Settings
          </Button>
          <Button
            onClick={handlePrint}
            disabled={labelItems.length === 0}
            className="bg-accent hover:bg-accent/90 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print {totalLabels > 0 ? `(${totalLabels})` : ""}
          </Button>
        </div>
      </div>

      {/* Label Settings Panel */}
      {showSettings && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Label Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Barcode Format</label>
                <select
                  value={settings.format}
                  onChange={(e) => setSettings((p) => ({ ...p, format: e.target.value as any }))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="CODE128">CODE128 (Universal)</option>
                  <option value="CODE39">CODE39</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC-A</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Label Width (px)</label>
                <Input
                  type="number"
                  min={100}
                  max={400}
                  value={settings.width}
                  onChange={(e) => setSettings((p) => ({ ...p, width: parseInt(e.target.value) || 200 }))}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Label Height (px)</label>
                <Input
                  type="number"
                  min={60}
                  max={200}
                  value={settings.height}
                  onChange={(e) => setSettings((p) => ({ ...p, height: parseInt(e.target.value) || 80 }))}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Font Size</label>
                <Input
                  type="number"
                  min={8}
                  max={16}
                  value={settings.fontSize}
                  onChange={(e) => setSettings((p) => ({ ...p, fontSize: parseInt(e.target.value) || 10 }))}
                  className="mt-1 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showName"
                  checked={settings.showName}
                  onChange={(e) => setSettings((p) => ({ ...p, showName: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="showName" className="text-sm cursor-pointer">Show Product Name</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showSku"
                  checked={settings.showSku}
                  onChange={(e) => setSettings((p) => ({ ...p, showSku: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="showSku" className="text-sm cursor-pointer">Show SKU</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPrice"
                  checked={settings.showPrice}
                  onChange={(e) => setSettings((p) => ({ ...p, showPrice: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="showPrice" className="text-sm cursor-pointer">Show Price</label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Labels Panel */}
        <div className="space-y-4">
          {/* Product Search */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" /> Add Product Labels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {products && products.length > 0 && (
                <div className="border border-border rounded-md bg-background max-h-48 overflow-y-auto">
                  {products.map((product: any) => (
                    <button
                      key={product.id}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent/10 transition-colors border-b border-border/50 last:border-0"
                      onClick={() => addProductLabel(product)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                            {product.barcode && ` | Barcode: ${product.barcode}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-accent">
                            ${parseFloat(product.retailPrice).toFixed(2)}
                          </span>
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {search.length >= 2 && products?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No products found</p>
              )}
            </CardContent>
          </Card>

          {/* Custom Label */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" /> Add Custom Label
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Barcode Value *</label>
                <Input
                  value={customBarcode}
                  onChange={(e) => setCustomBarcode(e.target.value)}
                  placeholder="Enter barcode or serial number"
                  className="mt-1"
                  onKeyDown={(e) => e.key === "Enter" && addCustomLabel()}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Label Name</label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Optional display name"
                  className="mt-1"
                />
              </div>
              <Button onClick={addCustomLabel} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Custom Label
              </Button>
            </CardContent>
          </Card>

          {/* Label Queue */}
          {labelItems.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Print Queue ({totalLabels} labels)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {labelItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded border border-border bg-background/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => updateCopies(item.id, item.copies - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.copies}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => updateCopies(item.id, item.copies + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeLabel(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Label Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {labelItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <QrCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No labels added yet</p>
                  <p className="text-sm mt-1">Search for products or add custom labels</p>
                </div>
              ) : (
                <div id="barcode-print-area" className="flex flex-wrap gap-3 p-2 bg-gray-100 rounded-lg min-h-32">
                  {labelItems.flatMap((item) =>
                    Array.from({ length: item.copies }, (_, i) => (
                      <BarcodeLabel
                        key={`${item.id}-${i}`}
                        item={item}
                        settings={settings}
                      />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}
