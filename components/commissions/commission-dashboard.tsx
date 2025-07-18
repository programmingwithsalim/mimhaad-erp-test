"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Plus,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCommissions } from "@/hooks/use-commissions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BranchIndicator } from "@/components/branch/branch-indicator";
import { CommissionTable } from "./commission-table";
import { CommissionFilters } from "./commission-filters";
import { AddCommissionDialog } from "./add-commission-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function CommissionDashboard() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState({});

  // Use the commissions hook
  const {
    commissions,
    statistics: hookStatistics,
    isLoading,
    error,
    refetch: refreshCommissions,
    updateCommission,
    deleteCommission,
    markCommissionPaid,
    canViewAllBranches,
  } = useCommissions(filters);

  console.log("Commission Dashboard State:", {
    commissionsCount: commissions?.length || 0,
    isLoading,
    error,
    user: user?.role,
    canViewAllBranches,
  });

  // Calculate local statistics
  const localStatistics = {
    totalAmount:
      commissions?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0,
    totalCount: commissions?.length || 0,
    pendingAmount:
      commissions
        ?.filter((c) => c.status === "pending")
        ?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0,
    pendingCount:
      commissions?.filter((c) => c.status === "pending")?.length || 0,
    paidAmount:
      commissions
        ?.filter((c) => c.status === "paid")
        ?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0,
    paidCount: commissions?.filter((c) => c.status === "paid")?.length || 0,
  };

  const handleAddCommission = async () => {
    try {
      console.log("🔄 [COMMISSION] Refreshing commission data...");
      // The commission form already handles the API call, so we just need to refresh the data
      await refreshCommissions();
      console.log("✅ [COMMISSION] Commission data refreshed successfully");
      setShowAddDialog(false);
      toast({
        title: "Commission Added",
        description: "Commission has been successfully created.",
      });
    } catch (error) {
      console.error("❌ [COMMISSION] Error in handleAddCommission:", error);
      console.error("❌ [COMMISSION] Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add commission",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      console.log("🔄 [COMMISSION] Refreshing commission data from table...");
      await refreshCommissions();
      console.log("✅ [COMMISSION] Commission data refreshed successfully");
    } catch (error) {
      console.error("❌ [COMMISSION] Error refreshing commissions:", error);
      toast({
        title: "Error",
        description: "Failed to refresh commission data",
        variant: "destructive",
      });
    }
  };

  const handleEditCommission = async (commission: any) => {
    try {
      await updateCommission(commission.id, commission);
      toast({
        title: "Commission Updated",
        description: "Commission has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating commission:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update commission",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCommission = async (commission: any) => {
    try {
      await deleteCommission(commission.id);
      toast({
        title: "Commission Deleted",
        description: "Commission has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting commission:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete commission",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (commission: any) => {
    try {
      await markCommissionPaid(commission.id, {
        method: "bank_transfer",
        receivedAt: new Date().toISOString(),
        notes: "Marked as paid from dashboard",
      });
      toast({
        title: "Commission Paid",
        description: "Commission has been marked as paid.",
      });
    } catch (error) {
      console.error("Error marking commission as paid:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to mark commission as paid",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Commission Management
            </h1>
            <p className="text-muted-foreground">
              Track and manage partner commissions
            </p>
          </div>
          <BranchIndicator />
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Error Loading Commissions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={refreshCommissions}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Commission Management
          </h1>
          <p className="text-muted-foreground">
            {canViewAllBranches
              ? "Track and manage partner commissions across all branches"
              : "Track and manage partner commissions for your branch"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BranchIndicator />
          <Button
            variant="outline"
            size="sm"
            onClick={refreshCommissions}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Commission
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Commissions
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(localStatistics.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {localStatistics.totalCount} entries
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(localStatistics.pendingAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {localStatistics.pendingCount} pending
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(localStatistics.paidAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {localStatistics.paidCount} completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {localStatistics.totalCount > 0
                    ? Math.round(
                        (localStatistics.paidCount /
                          localStatistics.totalCount) *
                          100
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment completion
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Commission History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Commission Distribution</CardTitle>
                <CardDescription>
                  Commission amounts by service provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : commissions && commissions.length > 0 ? (
                  <div className="space-y-3">
                    {commissions.slice(0, 5).map((commission) => (
                      <div
                        key={commission.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{commission.sourceName}</p>
                          <p className="text-sm text-muted-foreground">
                            {commission.reference}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(commission.amount)}
                          </p>
                          <Badge
                            variant={
                              commission.status === "paid"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No commissions found</p>
                    <p className="text-sm mt-1">
                      Add your first commission to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest commission entries</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : commissions && commissions.length > 0 ? (
                  <div className="space-y-3">
                    {commissions.slice(0, 5).map((commission) => (
                      <div
                        key={commission.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{commission.sourceName}</p>
                          <p className="text-sm text-muted-foreground">
                            {commission.reference}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(commission.amount)}
                          </p>
                          <Badge
                            variant={
                              commission.status === "paid"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No commissions found</p>
                    <p className="text-sm mt-1">
                      Add your first commission to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CommissionFilters onFiltersChange={setFilters} />
          <CommissionTable
            commissions={commissions || []}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onEdit={handleEditCommission}
            onDelete={handleDeleteCommission}
            onMarkPaid={handleMarkPaid}
          />
        </TabsContent>
      </Tabs>

      {/* Add Commission Dialog */}
      <AddCommissionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleAddCommission}
      />
    </div>
  );
}
