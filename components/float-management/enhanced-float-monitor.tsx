"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingDown, TrendingUp, Bell, BellOff } from "lucide-react"
import { useAppServices } from "@/lib/services/app-integration-service"
import { useFloatAccounts } from "@/hooks/use-float-accounts"

interface FloatAccount {
  id: string
  name: string
  balance: number
  threshold: number
  type: string
  status: string
}

export function EnhancedFloatMonitor() {
  const [monitoringEnabled, setMonitoringEnabled] = useState(true)
  const [lastAlertTime, setLastAlertTime] = useState<Record<string, number>>({})

  const { checkFloatBalance, preferences, sendNotification } = useAppServices()
  const { accounts, loading, error, refetch } = useFloatAccounts()

  // Monitor float balances every 5 minutes
  useEffect(() => {
    if (!monitoringEnabled || !accounts?.length) return

    const interval = setInterval(
      async () => {
        for (const account of accounts) {
          const now = Date.now()
          const lastAlert = lastAlertTime[account.id] || 0
          const fiveMinutes = 5 * 60 * 1000

          // Only send alert if it's been more than 5 minutes since last alert
          if (account.balance <= account.threshold && now - lastAlert > fiveMinutes) {
            await checkFloatBalance(account.name, account.balance, account.threshold)
            setLastAlertTime((prev) => ({ ...prev, [account.id]: now }))
          }
        }
      },
      5 * 60 * 1000,
    ) // Check every 5 minutes

    return () => clearInterval(interval)
  }, [accounts, monitoringEnabled, checkFloatBalance, lastAlertTime])

  const getBalanceStatus = (balance: number, threshold: number) => {
    const percentage = (balance / threshold) * 100
    if (percentage <= 25) return { status: "critical", color: "red" }
    if (percentage <= 50) return { status: "low", color: "orange" }
    if (percentage <= 75) return { status: "medium", color: "yellow" }
    return { status: "good", color: "green" }
  }

  const getProgressPercentage = (balance: number, threshold: number) => {
    return Math.min((balance / threshold) * 100, 100)
  }

  const sendTestAlert = async (account: FloatAccount) => {
    await sendNotification({
      type: "system",
      title: "Test Float Alert",
      message: `Test notification for ${account.name}. Current balance: GHS ${account.balance}`,
      userId: "current-user",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>Failed to load float accounts: {error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const lowBalanceAccounts = accounts?.filter((account) => account.balance <= account.threshold) || []

  return (
    <div className="space-y-4">
      {/* Header with monitoring toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Float Balance Monitor
              {preferences?.systemAlerts ? (
                <Bell className="h-4 w-4 text-green-500" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={monitoringEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setMonitoringEnabled(!monitoringEnabled)}
              >
                {monitoringEnabled ? "Monitoring On" : "Monitoring Off"}
              </Button>
              <Button variant="outline" size="sm" onClick={refetch}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Low balance alerts */}
      {lowBalanceAccounts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {lowBalanceAccounts.length} account(s) have low balances requiring attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Float accounts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts?.map((account) => {
          const balanceStatus = getBalanceStatus(account.balance, account.threshold)
          const progressPercentage = getProgressPercentage(account.balance, account.threshold)

          return (
            <Card key={account.id} className={`border-l-4 border-l-${balanceStatus.color}-500`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                  <Badge
                    variant={balanceStatus.status === "critical" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {balanceStatus.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Balance:</span>
                    <span className="font-medium">GHS {account.balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Threshold:</span>
                    <span>GHS {account.threshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                    <span>Threshold</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-xs">
                    {account.balance > account.threshold ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-gray-600">{account.type}</span>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => sendTestAlert(account)} className="text-xs h-6 px-2">
                    Test Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary stats */}
      {accounts && accounts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{accounts.length}</div>
                <div className="text-sm text-gray-600">Total Accounts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{lowBalanceAccounts.length}</div>
                <div className="text-sm text-gray-600">Low Balance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {accounts.filter((a) => a.balance > a.threshold).length}
                </div>
                <div className="text-sm text-gray-600">Healthy</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  GHS {accounts.reduce((sum, a) => sum + a.balance, 0).toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Total Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
