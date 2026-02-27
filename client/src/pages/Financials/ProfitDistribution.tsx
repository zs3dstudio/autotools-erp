/**
 * Profit Distribution — Phase-4 Financial Control Layer
 * Preview and finalize monthly investor pool distributions.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BarChart3, CheckCircle2, Calculator, ChevronDown, ChevronRight, Lock } from "lucide-react";

function fmt(n: number | string | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function DistributionHistoryRow({ dist }: { dist: any }) {
  const [expanded, setExpanded] = useState(false);
  const details = trpc.financials.distribution.details.useQuery(
    { distributionId: dist.id },
    { enabled: expanded }
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="font-medium">{dist.distributionPeriod}</p>
            <p className="text-xs text-muted-foreground">
              Finalized: {dist.finalizedAt ? new Date(dist.finalizedAt).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold text-blue-500">{fmt(dist.totalInvestorPool)}</p>
            <p className="text-xs text-muted-foreground">Investor pool</p>
          </div>
          {dist.isFinalized ? (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
              <Lock className="h-3 w-3 mr-1" /> Finalized
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Draft</Badge>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/10">
          {details.isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !details.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No distribution details</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left p-3 font-medium text-muted-foreground">Investor</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Capital Share</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Distributed Amount</th>
                </tr>
              </thead>
              <tbody>
                {details.data.map((d: any) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{d.investorName ?? `Investor ${d.investorId}`}</td>
                    <td className="p-3 text-right text-muted-foreground">{d.capitalSharePercent}%</td>
                    <td className="p-3 text-right font-semibold text-emerald-500">{fmt(d.distributedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfitDistributionPage() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const history = trpc.financials.distribution.history.useQuery();
  const preview = trpc.financials.distribution.preview.useQuery({ period }, { enabled: !!period });
  const utils = trpc.useUtils();

  const finalize = trpc.financials.distribution.finalize.useMutation({
    onSuccess: (data) => {
      toast.success(`Distribution for ${period} finalized successfully`);
      utils.financials.distribution.history.invalidate();
      utils.financials.distribution.preview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const isAlreadyFinalized = history.data?.some(
    (d: any) => d.distributionPeriod === period && d.isFinalized
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit Distribution</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calculate and finalize monthly investor pool distributions
          </p>
        </div>
        <Badge variant="outline" className="text-xs">Phase-4</Badge>
      </div>

      {/* Distribution Calculator */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Distribution Calculator</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="period">Period (YYYY-MM)</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-1"
              />
            </div>
            {isAdmin && (
              <Button
                variant={isAlreadyFinalized ? "secondary" : "default"}
                disabled={isAlreadyFinalized || finalize.isPending || !preview.data?.breakdown?.length}
                onClick={() => finalize.mutate({ period })}
              >
                {isAlreadyFinalized ? (
                  <><Lock className="h-4 w-4 mr-2" /> Already Finalized</>
                ) : finalize.isPending ? (
                  "Finalizing..."
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Finalize Distribution</>
                )}
              </Button>
            )}
          </div>

          {/* Preview */}
          {preview.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : preview.data ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Investor Pool (70%)</p>
                  <p className="text-xl font-bold text-blue-500 mt-1">{fmt(preview.data.totalPool)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Total Capital Base</p>
                  <p className="text-xl font-bold mt-1">{fmt(preview.data.grandTotalCapital)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Investors</p>
                  <p className="text-xl font-bold mt-1">{preview.data.breakdown?.length ?? 0}</p>
                </div>
              </div>

              {/* Breakdown table */}
              {preview.data.breakdown?.length > 0 ? (
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left p-3 font-medium text-muted-foreground">Investor</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Capital</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Share %</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.breakdown.map((row: any) => (
                      <tr key={row.investorId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-medium">{row.investorName}</td>
                        <td className="p-3 text-right text-muted-foreground">{fmt(row.totalCapital)}</td>
                        <td className="p-3 text-right">
                          <Badge variant="outline" className="text-xs">{row.capitalSharePercent}%</Badge>
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-500">{fmt(row.distributedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No investors with capital contributions found.</p>
                  <p className="text-sm mt-1">Add investors and capital contributions first.</p>
                </div>
              )}

              {isAlreadyFinalized && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-500">
                    This distribution has been finalized and is locked. No further changes can be made.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Distribution History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !history.data?.length ? (
            <div className="text-center py-8">
              <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No distributions finalized yet</p>
            </div>
          ) : (
            history.data.map((d: any) => (
              <DistributionHistoryRow key={d.id} dist={d} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
