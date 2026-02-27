import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Shield } from "lucide-react";

export default function AuditTrail() {
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const { data: logs, isLoading } = trpc.audit.list.useQuery({
    entityType: entityType || undefined,
  });

  // Client-side search filter by userName or details
  const filteredLogs = logs?.filter((log: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.userName ?? "").toLowerCase().includes(q) ||
      (log.userEmail ?? "").toLowerCase().includes(q) ||
      (log.details ?? "").toLowerCase().includes(q) ||
      (log.action ?? "").toLowerCase().includes(q)
    );
  });

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith("CREATE")) return "text-green-400";
    if (action.startsWith("UPDATE") || action.startsWith("ASSIGN")) return "text-blue-400";
    if (action.startsWith("DELETE") || action.startsWith("VOID") || action.startsWith("REJECT")) return "text-red-400";
    if (action.startsWith("APPROVE") || action.startsWith("COMPLETE")) return "text-accent";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-accent" />
        <h1 className="text-3xl font-bold">Audit Trail</h1>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Entity Types</option>
          <option value="Sale">Sale</option>
          <option value="StockTransfer">Transfer</option>
          <option value="InventoryItem">Inventory</option>
          <option value="Expense">Expense</option>
          <option value="HOPayment">HO Payment</option>
          <option value="User">User</option>
          <option value="Product">Product</option>
          <option value="Branch">Branch</option>
        </select>
      </div>

      {isLoading ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">Loading audit logs...</CardContent>
        </Card>
      ) : !filteredLogs || filteredLogs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center text-muted-foreground">No audit logs found</CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Date/Time</th>
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                  <th className="text-left py-3 px-4 font-semibold">Entity</th>
                  <th className="text-left py-3 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border hover:bg-card/50">
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p className="font-medium">{log.userName || "System"}</p>
                      {log.userEmail && (
                        <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-mono font-medium ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="text-muted-foreground">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-xs text-muted-foreground ml-1">#{log.entityId}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
