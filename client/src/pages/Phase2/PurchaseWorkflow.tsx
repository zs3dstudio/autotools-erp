/**
 * Purchase Workflow Management
 * Manage Purchase Orders, GRNs, Landing Costs, and Purchase Finalization
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Package, CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PurchaseWorkflow() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Workflow</h1>
          <p className="text-muted-foreground mt-1">
            Manage purchase orders, goods received notes, and supplier payments
          </p>
        </div>
        <Button>Create Purchase Order</Button>
      </div>

      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Workflow Stages</CardTitle>
          <CardDescription>
            Structured workflow from order to supplier payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Draft PO</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Submitted</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium">Approved</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium">GRN</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium">Finalized</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn">Goods Received Notes</TabsTrigger>
          <TabsTrigger value="landing-costs">Landing Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Draft POs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending GRN</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No purchase orders found. Create a new purchase order to get started.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>
                    Create and manage purchase orders with suppliers
                  </CardDescription>
                </div>
                <Button>New Purchase Order</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No purchase orders yet. Click "New Purchase Order" to create one.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Purchase Order Workflow</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Draft:</strong> Create PO with items and unit prices. No stock impact.
              </p>
              <p>
                <strong>Submit:</strong> Submit PO for approval.
              </p>
              <p>
                <strong>Approve:</strong> Admin approves the PO.
              </p>
              <p>
                <strong>GRN:</strong> Create Goods Received Note when items arrive.
              </p>
              <p>
                <strong>Finalize:</strong> Apply landing costs and finalize purchase. Stock updates and supplier payable is created in ledger.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grn" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Goods Received Notes</CardTitle>
                  <CardDescription>
                    Record goods received from suppliers
                  </CardDescription>
                </div>
                <Button>New GRN</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No GRNs found. Create a GRN from an approved purchase order.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">GRN Features</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Temporary Stock:</strong> GRN creates temporary stock entry for received items.
              </p>
              <p>
                <strong>Landing Costs:</strong> Add freight, customs, insurance, and other costs.
              </p>
              <p>
                <strong>Reversible:</strong> GRN can be reversed before finalization.
              </p>
              <p>
                <strong>Audit Trail:</strong> All GRN operations are logged for compliance.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landing-costs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Landing Costs</CardTitle>
                  <CardDescription>
                    Manage freight, customs, insurance, and other purchase costs
                  </CardDescription>
                </div>
                <Button>Add Landing Cost</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No landing costs recorded yet. Add costs to GRNs during the finalization process.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Landing Cost Types</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p><strong>Freight:</strong> Shipping and transportation costs</p>
              <p><strong>Customs:</strong> Import duties and customs fees</p>
              <p><strong>Insurance:</strong> Goods in transit insurance</p>
              <p><strong>Handling:</strong> Warehouse handling and processing fees</p>
              <p><strong>Other:</strong> Any other purchase-related costs</p>
              <p className="mt-3">
                Landing costs are added to the base purchase price to calculate the final landed cost, which updates the warehouse cost for inventory valuation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
