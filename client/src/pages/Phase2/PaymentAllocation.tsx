/**
 * Payment Allocation Management
 * Manage invoices, record payments, and track outstanding balances
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, DollarSign, TrendingUp, Clock } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PaymentAllocation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Allocation</h1>
          <p className="text-muted-foreground mt-1">
            Manage invoices, record payments, and track outstanding balances
          </p>
        </div>
        <Button>Create Invoice</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              From overpayments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              All statuses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="aging">Invoice Aging</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Paid</span>
                  <Badge variant="outline">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Partially Paid</span>
                  <Badge variant="outline">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unpaid</span>
                  <Badge variant="outline">0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overdue</span>
                  <Badge variant="destructive">0</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No invoices found. Create a new invoice to get started.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>
                    Manage sales, purchase, and credit note invoices
                  </CardDescription>
                </div>
                <Button>New Invoice</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No invoices yet. Click "New Invoice" to create one.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Invoice Types</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Sales Invoice:</strong> Issued to customers for goods sold.
              </p>
              <p>
                <strong>Purchase Invoice:</strong> Received from suppliers for goods purchased.
              </p>
              <p>
                <strong>Credit Note:</strong> Issued for returns or adjustments (reduces outstanding).
              </p>
              <p>
                <strong>Debit Note:</strong> Issued for additional charges (increases outstanding).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Recording</CardTitle>
                  <CardDescription>
                    Record payments against invoices
                  </CardDescription>
                </div>
                <Button>Record Payment</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No payments recorded yet. Create invoices first, then record payments.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Payment Features</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Full Payment:</strong> Pay invoice in full in a single transaction.
              </p>
              <p>
                <strong>Partial Payment:</strong> Pay portion of invoice, remaining balance due later.
              </p>
              <p>
                <strong>Overpayment:</strong> Pay more than invoice amount. Excess becomes credit for future use.
              </p>
              <p>
                <strong>Multiple Payments:</strong> Record multiple payments against single invoice.
              </p>
              <p>
                <strong>Payment Methods:</strong> Cash, Card, Bank Transfer, Cheque.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Aging Report</CardTitle>
              <CardDescription>
                Invoices categorized by days overdue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Current</p>
                      <p className="text-sm text-muted-foreground">0 days overdue</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold">$0.00</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">30+ Days</p>
                      <p className="text-sm text-muted-foreground">1-30 days overdue</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold">$0.00</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">60+ Days</p>
                      <p className="text-sm text-muted-foreground">31-60 days overdue</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold">$0.00</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">90+ Days</p>
                      <p className="text-sm text-muted-foreground">61+ days overdue</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold">$0.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Balances</CardTitle>
              <CardDescription>
                Suppliers and customers with unpaid invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No outstanding balances. All invoices are paid.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Outstanding Balance Tracking</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Automatic Calculation:</strong> Outstanding balance = Invoice Total - Paid Amount.
              </p>
              <p>
                <strong>Supplier View:</strong> See all outstanding invoices per supplier.
              </p>
              <p>
                <strong>Customer View:</strong> See all outstanding invoices per customer.
              </p>
              <p>
                <strong>Credit Tracking:</strong> Overpayment credits shown separately from outstanding.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
