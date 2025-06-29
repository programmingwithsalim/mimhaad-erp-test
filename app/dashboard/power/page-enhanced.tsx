"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { RefreshCw, Zap, TrendingUp, AlertTriangle, Activity, Wallet, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"
import { PowerTransactionFormEnhanced } from "@/components/power/power-transaction-form-enhanced"
import { PowerTransactionTable } from "@/components/power/power-transaction-table"
import { PowerFloatRecharge } from "@/components/power/power-float-recharge"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface PowerTransaction {
  id: string
  reference: string
  meterNumber: string
  provider: string
  amount: number
  customerName?: string
  customerPhone?: string
  status: string
  createdAt: string
}

interface PowerStatistics {
  totalTransactions: number
  totalAmount: number
  totalFees: number
  activeProviders: number
}

interface FloatAccount {
  id: string
  provider: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  account_type: string
  is_active: boolean
}

interface CashTillBalance {
  balance: number
  lastUpdated: string
}

export default function PowerPageEnhanced() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [transactions, setTransactions] = useState<PowerTransaction[]>([])
  const [statistics, setStatistics] = useState<PowerStatistics | null>(null)
  const [powerFloats, setPowerFloats] = useState<FloatAccount[]>([])
  const [cashTillBalance, setCashTillBalance] = useState<CashTillBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/power/transactions")
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error("Error fetching power transactions:", error)
      toast({
        title: "Error",
        description: "Failed to load power transactions",
        variant: "destructive",
      })
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/power/statistics")
      if (response.ok) {
        const data = await response.json()
        setStatistics(
          data.statistics || {
            totalTransactions: 0,
            totalAmount: 0,
            totalFees: 0,
            activeProviders: 0,
          },
        )
      }
    } catch (error) {
      console.error("Error fetching power statistics:", error)
    }
  }

  const fetchPowerFloats = async () => {
    try {
      const response = await fetch("/api/float-accounts?type=power")
      if (response.ok) {
        const data = await response.json()
        setPowerFloats(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching power floats:", error)
    }
  }

  const fetchCashTillBalance = async () => {
    try {
      if (!user?.branchId) return

      const response = await fetch(`/api/branches/${user.branchId}/cash-in-till`)
      if (response.ok) {
        const data = await response.json()
        setCashTillBalance(data.cashTill || { balance: 0, lastUpdated: new Date().toISOString() })
      }
    } catch (error) {
      console.error("Error fetching cash till balance:", error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.all([fetchTransactions(), fetchStatistics(), fetchPowerFloats(), fetchCashTillBalance()])
    setLoading(false)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchTransactions(), fetchStatistics(), fetchPowerFloats(), fetchCashTillBalance()])
    setRefreshing(false)
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const handleTransactionSuccess = () => {
    refreshData()
    toast({
      title: "Success",
      description: "Power transaction processed successfully",
    })
  }

  const handleTransactionUpdated = () => {
    refreshData()
    toast({
      title: "Success",
      description: "Transaction updated successfully",
    })
  }

  const handleTransactionDeleted = () => {
    refreshData()
    toast({
      title: "Success",
      description: "Transaction deleted successfully",
    })
  }

  const getFloatStatus = (current: number, min: number) => {
    if (current < min) return { label: "Critical", color: "destructive" }
    if (current < min * 1.5) return { label: "Low", color: "warning" }
    return { label: "Healthy", color: "success" }
  }

  const statsCards = [
    {
      title: "Total Transactions",
      value: statistics?.totalTransactions || 0,
      icon: Activity,
      description: "All time transactions",
    },
    {
      title: "Total Amount",
      value: `GHS ${(statistics?.totalAmount || 0).toFixed(2)}`,
      icon: TrendingUp,
      description: "Total transaction value",
    },
    {
      title: "Total Fees",
      value: `GHS ${(statistics?.totalFees || 0).toFixed(2)}`,
      icon: Zap,
      description: "Total fees collected",
    },
    {
      title: "Active Providers",
      value: statistics?.activeProviders || 0,
      icon: AlertTriangle,
      description: "Available power providers",
    },
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8" />
            Power Services
          </h1>
          <p className="text-muted-foreground">Manage electricity bill payments and power services</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
          <TabsTrigger value="recharge">Float Recharge</TabsTrigger>
        </TabsList>

        {/* New Transaction Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Process Power Transaction</CardTitle>
                  <CardDescription>Process electricity bill payments for customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <PowerTransactionFormEnhanced onSuccess={handleTransactionSuccess} powerFloats={powerFloats} />
                </CardContent>
              </Card>
            </div>

            {/* Float Balances Sidebar */}
            <div className="space-y-4">
              {/* Cash in Till */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cash in Till
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <div>
                      <div className="text-2xl font-bold">GHS {(cashTillBalance?.balance || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated:{" "}
                        {cashTillBalance?.lastUpdated
                          ? new Date(cashTillBalance.lastUpdated).toLocaleTimeString()
                          : "Never"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Power Float Balances */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Power Float Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : powerFloats.length > 0 ? (
                    <div className="space-y-3">
                      {powerFloats.map((float) => {
                        const status = getFloatStatus(float.current_balance, float.min_threshold)
                        return (
                          <div key={float.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{float.provider}</span>
                              <Badge variant={status.color as any} className="text-xs">
                                {status.label}
                              </Badge>
                            </div>
                            <div className="text-lg font-bold">GHS {float.current_balance.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Min: GHS {float.min_threshold.toLocaleString()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No power floats found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage power transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <PowerTransactionTable
                  transactions={transactions}
                  onTransactionUpdated={handleTransactionUpdated}
                  onTransactionDeleted={handleTransactionDeleted}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Float Recharge Tab */}
        <TabsContent value="recharge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Power Float Recharge</CardTitle>
              <CardDescription>Recharge power service float accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <PowerFloatRecharge onSuccess={refreshData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
