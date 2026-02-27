/**
 * Operational Reports
 * Stock valuation, profitability, transfer profit, supplier balances, and cash flow reports
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function OperationalReports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("stock-valuation");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Fetch branches for filter
  const { data: branches } = trpc.branches.list.useQuery();

  // Fetch stock valuation report
  const { data: stockValuation, isLoading: isLoadingStock } =
    trpc.phase2.reporting.stockValuation.useQuery(
      selectedBranch !== "all" ? { branchId: parseInt(selectedBranch) } : undefined
    );

  // Fetch supplier outstanding balances
  const { data: supplierBalances, isLoading: isLoadingSuppliers } =
    trpc.phase2.reporting.supplierOutstandingBalances.useQuery();

  // Fetch invoice aging summary
  const { data: agingSummary, isLoading: isLoadingAging } =
    trpc.phase2.reporting.invoiceAgingSummary.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operational Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive reports on stock, profitability, and cash flow
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stock-valuation">Stock Valuation</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="transfer-profit">Transfer Profit</TabsTrigger>
          <TabsTrigger value="supplier-balances">Supplier Balances</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-valuation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stock Valuation Report</CardTitle>
                  <CardDescription>
                    Inventory value by location and product
                  </CardDescription>
                </div>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 max-w-xs">
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoadingStock ? (
                <p className="text-muted-foreground text-center py-8">Loading report...</p>
              ) : stockValuation && stockValuation.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Branch</th>
                        <th className="text-left py-3 px-4 font-medium">Product</th>
                        <th className="text-right py-3 px-4 font-medium">Quantity</th>
                        <th className="text-right py-3 px-4 font-medium">Unit Price</th>
                        <th className="text-right py-3 px-4 font-medium">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockValuation.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">Branch {item.branchId}</td>
                          <td className="py-3 px-4">Product {item.productId}</td>
                          <td className="text-right py-3 px-4">{item.quantity}</td>
                          <td className="text-right py-3 px-4">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format((item.totalValue || 0) / (item.quantity || 1))}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(item.totalValue || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No stock data available for the selected location.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Branch Profitability Report</CardTitle>
                  <CardDescription>
                    Profit by branch and date range
                  </CardDescription>
                </div>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Profitability report coming soon. This report will show profit breakdown by branch and date range using Phase-1 ledger data.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Profitability Metrics</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Gross Profit:</strong> Sales revenue minus cost of goods sold.
              </p>
              <p>
                <strong>Net Profit:</strong> Gross profit minus operating expenses.
              </p>
              <p>
                <strong>Profit Margin:</strong> Net profit as percentage of sales.
              </p>
              <p>
                <strong>Branch Comparison:</strong> Compare profitability across branches.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer-profit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transfer Profit Summary</CardTitle>
                  <CardDescription>
                    Internal transfer profit distribution (70/30 split)
                  </CardDescription>
                </div>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Transfer profit report coming soon. This report will show profit from inter-branch transfers with 70/30 split allocation.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Transfer Profit Logic</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Internal Transfer:</strong> Stock moved between branches at marked-up price.
              </p>
              <p>
                <strong>Profit Calculation:</strong> Difference between transfer price and cost.
              </p>
              <p>
                <strong>70/30 Split:</strong> 70% to investor pool, 30% to master branch.
              </p>
              <p>
                <strong>Ledger Posting:</strong> Profit automatically posted to ledger on transfer completion.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier-balances" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Supplier Outstanding Balances</CardTitle>
                  <CardDescription>
                    Unpaid invoices and outstanding amounts by supplier
                  </CardDescription>
                </div>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSuppliers ? (
                <p className="text-muted-foreground text-center py-8">Loading report...</p>
              ) : supplierBalances && supplierBalances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Supplier</th>
                        <th className="text-right py-3 px-4 font-medium">Invoices</th>
                        <th className="text-right py-3 px-4 font-medium">Outstanding</th>
                        <th className="text-right py-3 px-4 font-medium">Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierBalances.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">Supplier {item.supplierId}</td>
                          <td className="text-right py-3 px-4">{item.invoiceCount || 0}</td>
                          <td className="text-right py-3 px-4 font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(item.totalOutstanding || 0)}
                          </td>
                          <td className="text-right py-3 px-4">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No outstanding supplier balances. All invoices are paid.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daily Cash Flow Report</CardTitle>
                  <CardDescription>
                    Cash inflows and outflows by day
                  </CardDescription>
                </div>
                <Button variant="outline">Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cash flow report coming soon. This report will show daily cash receipts, payments, and net cash position.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Cash Flow Components</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Cash Inflows:</strong> Sales receipts, customer payments, other income.
              </p>
              <p>
                <strong>Cash Outflows:</strong> Supplier payments, expenses, transfers.
              </p>
              <p>
                <strong>Net Cash Flow:</strong> Inflows minus outflows.
              </p>
              <p>
                <strong>Cash Position:</strong> Cumulative cash balance by day.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
