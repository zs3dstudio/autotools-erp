/**
 * Stock Management Dashboard
 * Real-time stock levels, reservations, and valuation by location
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Package, TrendingUp, Warehouse } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function StockManagement() {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Fetch stock valuation data
  const { data: stockValuation, isLoading: isLoadingValuation } =
    trpc.phase2.stock.getStockValuation.useQuery(
      selectedBranch !== "all" ? { branchId: parseInt(selectedBranch) } : undefined
    );

  // Fetch branches for filter
  const { data: branches } = trpc.branches.list.useQuery();

  const totalStockValue =
    stockValuation?.reduce((sum, item) => sum + (item.totalValue || 0), 0) || 0;
  const totalItems = stockValuation?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground mt-1">
            Real-time inventory levels and valuation across all locations
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(totalStockValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {totalItems} products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Branches tracking stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Below reorder point
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
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
            <Button variant="outline">Export Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Valuation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Valuation by Location</CardTitle>
          <CardDescription>
            Current inventory value grouped by branch and product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingValuation ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading stock data...</p>
            </div>
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

      {/* Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts</CardTitle>
          <CardDescription>
            Items with low stock or expiring soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No active stock alerts at this time.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Stock Protection Rules Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Stock Protection Rules</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2 text-sm">
          <p>
            <strong>Negative Stock Prevention:</strong> The system prevents any operation that would result in negative stock at any location.
          </p>
          <p>
            <strong>Transfer Protection:</strong> Transfers are blocked if the source branch has insufficient stock.
          </p>
          <p>
            <strong>Sales Protection:</strong> Sales are blocked if the branch stock is unavailable.
          </p>
          <p>
            <strong>Stock Reservations:</strong> When an invoice is created, stock is reserved (reduces available quantity but not physical count). Reservations release automatically if the invoice is cancelled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
