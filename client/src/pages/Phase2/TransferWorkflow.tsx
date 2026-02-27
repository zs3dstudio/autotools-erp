/**
 * Transfer Workflow Management
 * Manage staged transfer requests with approval, dispatch, and receive stages
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Send, CheckCircle, Package, ArrowRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TransferWorkflow() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfer Workflow</h1>
          <p className="text-muted-foreground mt-1">
            Manage inter-branch stock transfers with approval and tracking
          </p>
        </div>
        <Button>Request Stock Transfer</Button>
      </div>

      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Workflow Stages</CardTitle>
          <CardDescription>
            Four-stage controlled transfer process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Request</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="text-sm font-medium">Approval</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium">Dispatch</span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium">Receive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Transfer Requests</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
          <TabsTrigger value="receive">Receive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No transfers found. Create a new transfer request to get started.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transfer Requests</CardTitle>
                  <CardDescription>
                    Branch-initiated stock transfer requests
                  </CardDescription>
                </div>
                <Button>New Transfer Request</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No transfer requests yet. Click "New Transfer Request" to create one.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Request Stage</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Initiated by:</strong> Branch manager requests stock from warehouse or another branch.
              </p>
              <p>
                <strong>Stock Check:</strong> System verifies source has sufficient stock (after reservations).
              </p>
              <p>
                <strong>No Stock Impact:</strong> Stock is not deducted at this stage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription>
                    Review and approve transfer requests (Admin only)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No pending approvals. All transfer requests have been processed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Approval Stage</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Admin Review:</strong> Head Office reviews and approves transfer requests.
              </p>
              <p>
                <strong>Approval Logic:</strong> Can approve, reject, or request modifications.
              </p>
              <p>
                <strong>No Stock Impact:</strong> Stock is not affected during approval.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dispatch Transfers</CardTitle>
                  <CardDescription>
                    Dispatch approved transfers from warehouse
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No transfers ready for dispatch. Approve transfer requests first.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Dispatch Stage</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Stock Deduction:</strong> Source branch stock is deducted at this stage.
              </p>
              <p>
                <strong>Warehouse Operation:</strong> Warehouse staff marks items as dispatched.
              </p>
              <p>
                <strong>Tracking:</strong> Transfer enters "In Transit" status.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receive" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Receive Transfers</CardTitle>
                  <CardDescription>
                    Receive dispatched transfers at destination branch
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No transfers in transit. Dispatch transfers first.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Receive Stage</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2 text-sm">
              <p>
                <strong>Stock Addition:</strong> Destination branch stock is added at this stage.
              </p>
              <p>
                <strong>Quality Check:</strong> Branch staff verifies received items match dispatch.
              </p>
              <p>
                <strong>Transfer Complete:</strong> Transfer marked as complete and profit calculated.
              </p>
              <p>
                <strong>Profit Split:</strong> Internal transfer profit (70/30) recorded in ledger.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
