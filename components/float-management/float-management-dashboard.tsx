"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, BarChart3, CircleDollarSign, TrendingDown, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FloatStatistics {
  totalAccounts: number
  totalBalance: number
  lowBalanceAccounts: number
  healthyAccounts: number
  excessBalanceAccounts: number
  accountTypeBreakdown: Record<string, number>
}

interface RecentTransaction {
  id: string
  type: string
  amount: number
  date: string
  status: string
  branchId: string
  branchName: string
  serviceType: string
  provider?: string
}

export function FloatManagementDashboard() {
  const [statistics, setStatistics] = useState<FloatStatistics | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchStatistics = async () => {
    setStatsLoading(true)
    setStatsError(null)

    try {
      console.log("Dashboard: Fetching statistics")
      const response = await fetch("/api/float-accounts/statistics")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to fetch statistics: ${response.status}`
        console.error("Dashboard: Statistics fetch failed:", errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Dashboard: Statistics fetched successfully:", data)

      // Transform the data to match our component's expected format
      const transformedStats: FloatStatistics = {
        totalAccounts: data.total_accounts || 0,
        totalBalance: data.total_balance || 0,
        lowBalanceAccounts: data.low_balance_accounts || 0,
        healthyAccounts: data.healthy_accounts || 0,
        excessBalanceAccounts: data.excess_balance_accounts || 0,
        accountTypeBreakdown: {},
      }

      // Transform account type breakdown
      if (data.account_type_breakdown && Array.isArray(data.account_type_breakdown)) {
        data.account_type_breakdown.forEach((item: any) => {
          if (item.account_type && item.total_balance !== undefined) {
            transformedStats.accountTypeBreakdown[item.account_type] = Number(item.total_balance)
          }
        })
      }

      setStatistics(transformedStats)
    } catch (err) {
      console.error("Dashboard: Error in statistics fetch:", err)
      setStatsError(err instanceof Error ? err.message : String(err))

      // Don't show toast for statistics error, just log it
      console.warn("Statistics could not be loaded:", err)

      // Set default statistics
      setStatistics({
        totalAccounts: 0,
        totalBalance: 0,
        lowBalanceAccounts: 0,
        healthyAccounts: 0,
        excessBalanceAccounts: 0,
        accountTypeBreakdown: {},
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchAccounts = async () => {
    setAccountsLoading(true)
    setAccountsError(null)

    try {
      console.log("Dashboard: Fetching accounts")
      const response = await fetch("/api/float-accounts")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Failed to fetch accounts: ${response.status}`
        console.error("Dashboard: Accounts fetch failed:", errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`Dashboard: Accounts fetched successfully: ${data.length} accounts`)

      // We don't need to set accounts state here, but we can use the count
      if (!statistics) {
        setStatistics((prev) => ({
          ...(prev || {
            lowBalanceAccounts: 0,
            healthyAccounts: 0,
            excessBalanceAccounts: 0,
            accountTypeBreakdown: {},
          }),
          totalAccounts: data.length,
          totalBalance: data.reduce((sum: number, account: any) => sum + (Number(account.current_balance) || 0), 0),
        }))
      }
    } catch (err) {
      console.error("Dashboard: Error in accounts fetch:", err)
      setAccountsError(err instanceof Error ? err.message : String(err))
      toast({
        title: "Error loading accounts",
        description: err instanceof Error ? err.message : "Failed to load accounts",
        variant: "destructive",
      })
    } finally {
      setAccountsLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      console.log("Dashboard: Fetching recent transactions")
      const response = await fetch("/api/float-transactions?limit=5")

      if (!response.ok) {
        console.warn("Dashboard: Transactions fetch failed, but continuing")
        return // Don't throw, just return
      }

      const data = await response.json()
      console.log(`Dashboard: Transactions fetched successfully: ${data.length} transactions`)

      if (Array.isArray(data)) {
        setRecentTransactions(
          data.map((tx: any) => ({
            id: tx.id,
            type: tx.type || "unknown",
            amount: Number(tx.amount) || 0,
            date: tx.date || new Date().toISOString(),
            status: tx.status || "pending",
            branchId: tx.branch_id || tx.branchId || "",
            branchName: tx.branch_name || "Unknown Branch",
            serviceType: tx.service_type || tx.serviceType || "Unknown",
            provider: tx.provider,
          })),
        )
      }
    } catch (err) {
      console.warn("Dashboard: Transactions fetch failed, but continuing:", err)
      // Don't set error state or show toast for transactions
    }
  }

  useEffect(() => {
    console.log("Dashboard: Component mounted, fetching data")

    // Fetch accounts and statistics in parallel
    fetchAccounts()
    fetchStatistics()
    fetchTransactions()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Function to retry fetching statistics
  const retryStatistics = () => {
    console.log("Dashboard: Retrying statistics fetch")
    fetchStatistics()
  }

  // Function to retry fetching accounts
  const retryAccounts = () => {
    console.log("Dashboard: Retrying accounts fetch")
    fetchAccounts()
  }

  // Show critical error if accounts failed to load
  if (accountsError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading accounts data</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{accountsError}</p>
          <Button variant="outline" size="sm" onClick={retryAccounts} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading Accounts
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Show warning for statistics error */}
      {statsError && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Statistics could not be loaded</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Basic account information is available, but detailed statistics could not be loaded.</p>
            <p className="text-sm text-muted-foreground">{statsError}</p>
            <Button variant="outline" size="sm" onClick={retryStatistics} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Loading Statistics
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Float</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {accountsLoading || statsLoading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(statistics?.totalBalance || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {accountsLoading ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                <>
                  <span>Across {statistics?.totalAccounts || 0} accounts</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Balance Accounts</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.lowBalanceAccounts || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                <>
                  {statistics?.lowBalanceAccounts ? (
                    <TrendingDown className="mr-1 h-3 w-3 inline text-red-500" />
                  ) : null}
                  <span className={statistics?.lowBalanceAccounts ? "text-red-500 font-medium" : ""}>
                    {statistics?.lowBalanceAccounts ? "Requires attention" : "All accounts healthy"}
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Accounts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.healthyAccounts || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                <span className="font-medium">Within threshold limits</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Excess Balance</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.excessBalanceAccounts || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {statsLoading ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                <span className="font-medium">Above maximum threshold</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Link href="/dashboard/float-management/accounts" passHref>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Manage Float Accounts</CardTitle>
              <CardDescription>View and manage all float accounts</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create, edit, and monitor float accounts across all branches and services
              </p>
              <Button variant="ghost" size="icon">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/float-management/allocation" passHref>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Float Allocation</CardTitle>
              <CardDescription>Allocate and transfer float</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Allocate new float, transfer between accounts, and view allocation history
              </p>
              <Button variant="ghost" size="icon">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Debug information in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 border border-dashed rounded-md">
          <h3 className="text-sm font-semibold mb-2">Debug Information</h3>
          <div className="text-xs space-y-1">
            <p>Accounts Loading: {accountsLoading ? "Yes" : "No"}</p>
            <p>Statistics Loading: {statsLoading ? "Yes" : "No"}</p>
            <p>Accounts Error: {accountsError || "None"}</p>
            <p>Statistics Error: {statsError || "None"}</p>
            <p>Total Accounts: {statistics?.totalAccounts || 0}</p>
            <p>Account Types: {Object.keys(statistics?.accountTypeBreakdown || {}).join(", ") || "None"}</p>
          </div>
        </div>
      )}
    </div>
  )
}
