import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Trash2, ShoppingCart, Printer, ScanLine, CheckCircle, UserSearch, X } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: number;
  serialNo: string;
  productId: number;
  branchId: number;
  status: string;
  product: {
    id: number;
    name: string;
    sku: string;
    retailPrice: string;
  } | undefined;
}

export default function POS() {
  const [branchId, setBranchId] = useState<number>(0);
  const [serialInput, setSerialInput] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentType, setPaymentType] = useState<"Cash" | "Card" | "Transfer" | "Mixed">("Cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [lastSale, setLastSale] = useState<{ receiptNo: string; totalAmount: number } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const serialInputRef = useRef<HTMLInputElement>(null);

  const { data: branches } = trpc.branches.list.useQuery();
  const { data: customerResults } = trpc.customers.list.useQuery(
    { search: customerSearch || undefined },
    { enabled: showCustomerSearch && customerSearch.length >= 2 }
  );
  const lookupQuery = trpc.pos.lookupSerial.useQuery(
    { serialNo: serialInput, branchId },
    { enabled: false }
  );

  const createSaleMutation = trpc.pos.createSale.useMutation({
    onSuccess: (data) => {
      toast.success(`Sale completed: ${data.receiptNo}`);
      setLastSale({ receiptNo: data.receiptNo, totalAmount: data.totalAmount });
      setCart([]);
      setDiscount("0");
      setCustomerName("");
      setCustomerPhone("");
      // Refocus the serial input for next sale
      setTimeout(() => serialInputRef.current?.focus(), 100);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create sale");
    },
  });

  const handleLookupSerial = async () => {
    if (!serialInput.trim()) {
      toast.error("Enter a serial number");
      return;
    }
    if (!branchId) {
      toast.error("Select a branch first");
      return;
    }
    // Prevent duplicate serials in cart
    if (cart.some((item) => item.serialNo === serialInput.trim())) {
      toast.error("This item is already in the cart");
      setSerialInput("");
      return;
    }
    setLookingUp(true);
    try {
      const result = await lookupQuery.refetch();
      if (result.data) {
        setCart((prev) => [
          ...prev,
          { ...result.data!.item, product: result.data!.product as any },
        ]);
        setSerialInput("");
        toast.success(`Added: ${result.data.product?.name ?? result.data.item.serialNo}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Item not found or not available");
    } finally {
      setLookingUp(false);
      serialInputRef.current?.focus();
    }
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!branchId) {
      toast.error("Select a branch first");
      return;
    }
    createSaleMutation.mutate({
      branchId,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      discount,
      paymentType,
      items: cart.map((item) => ({
        serialNo: item.serialNo,
        retailPrice: item.product?.retailPrice?.toString() || "0",
      })),
    });
  };

  const handlePrintReceipt = () => {
    if (!lastSale && cart.length === 0) {
      toast.error("No sale to print");
      return;
    }
    window.print();
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.product?.retailPrice || "0"), 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = subtotal - discountAmount;
  const branchName = branches?.find((b: any) => b.id === branchId)?.name;

  return (
    <>
    {/* Print-only receipt */}
    <div className="hidden print:block p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">AutoTools ERP</h1>
        {branchName && <p className="text-sm">{branchName}</p>}
        <p className="text-sm">{new Date().toLocaleString()}</p>
        {lastSale && <p className="font-mono text-sm mt-2">Receipt: {lastSale.receiptNo}</p>}
      </div>
      {customerName && <p className="text-sm mb-2">Customer: {customerName}</p>}
      <hr className="my-2" />
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-left">Serial</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item, i) => (
            <tr key={i}>
              <td>{item.product?.name}</td>
              <td className="font-mono text-xs">{item.serialNo}</td>
              <td className="text-right">${parseFloat(item.product?.retailPrice || "0").toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2" />
      <div className="text-right space-y-1">
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        {discountAmount > 0 && <p>Discount: -${discountAmount.toFixed(2)}</p>}
        <p className="font-bold text-lg">Total: ${total.toFixed(2)}</p>
        <p>Payment: {paymentType}</p>
      </div>
      <p className="text-center text-xs mt-6">Thank you for your purchase!</p>
    </div>

    {/* Screen UI */}
    <div className="print:hidden grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-accent" /> Barcode / Serial Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Branch *</label>
              <select
                value={branchId}
                onChange={(e) => { setBranchId(parseInt(e.target.value)); setCart([]); }}
                className="input-field w-full mt-1"
              >
                <option value={0}>Select Branch</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Input
                ref={serialInputRef}
                autoFocus
                placeholder="Scan or type serial number, then press Enter..."
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookupSerial()}
                className="input-field flex-1"
                disabled={!branchId}
              />
              <Button
                onClick={handleLookupSerial}
                disabled={lookingUp || !branchId}
                className="bg-accent"
              >
                {lookingUp ? "..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Cart is empty — scan a serial number to add items
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-card/50 rounded border border-border"
                  >
                    <div>
                      <p className="font-mono text-accent text-sm">{item.serialNo}</p>
                      <p className="text-xs text-muted-foreground">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold">
                        ${parseFloat(item.product?.retailPrice || "0").toFixed(2)}
                      </p>
                      <Button
                        onClick={() => handleRemoveItem(idx)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {lastSale && (
          <Card className="bg-card border-border border-green-500/30">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium text-green-400">Sale Completed</p>
                <p className="text-sm text-muted-foreground">
                  Receipt: {lastSale.receiptNo} — Total: ${lastSale.totalAmount.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Sale Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Customer</label>
              <div className="relative mt-1">
                <div className="flex gap-2">
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name (optional)"
                    className="input-field flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                    title="Search existing customers"
                  >
                    <UserSearch className="w-4 h-4" />
                  </Button>
                </div>
                {showCustomerSearch && (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="input-field"
                      autoFocus
                    />
                    {customerResults && customerResults.length > 0 && (
                      <div className="border border-border rounded-md bg-card max-h-40 overflow-y-auto">
                        {customerResults.map((c: any) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 hover:bg-accent/10 transition-colors text-sm"
                            onClick={() => {
                              setCustomerName(c.name);
                              setCustomerPhone(c.phone ?? "");
                              setCustomerSearch("");
                              setShowCustomerSearch(false);
                              toast.success(`Customer selected: ${c.name}`);
                            }}
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {customerSearch.length >= 2 && customerResults?.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2">No customers found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Customer Phone</label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Optional"
                className="input-field mt-1"
              />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-sm font-medium">Discount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input-field mt-1"
                />
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-red-400">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total:</span>
                <span className="text-accent">${total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="input-field w-full mt-1"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Transfer">Transfer</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={createSaleMutation.isPending || cart.length === 0 || !branchId}
              className="w-full bg-accent text-accent-foreground h-12 text-lg font-bold"
            >
              {createSaleMutation.isPending ? "Processing..." : `Checkout — $${total.toFixed(2)}`}
            </Button>

            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handlePrintReceipt}
              disabled={cart.length === 0 && !lastSale}
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
