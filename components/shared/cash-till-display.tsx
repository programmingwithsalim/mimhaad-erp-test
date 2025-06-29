"use client"

import { AlertTriangle, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCashInTill } from "@/hooks/use-cash-in-till"

interface CashTillDisplayProps {
  branchId: string
  error?: string | null | undefined
  refetch?: () => void
}

export function CashTillDisplay({ branchId, error: propError, refetch: propRefetch }: CashTillDisplayProps) {
  const { cashAccount, isLoading, error: hookError, updateCashBalance } = useCashInTill(branchId)

  const error = propError || (hookError && hookError.message !== "No branch ID provided" ? hookError.message : null)
  const refetch = propRefetch || (() => window.location.reload())

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Till</CardTitle>
          <CardDescription>Loading cash till information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error only for actual errors, not for missing accounts
  if (error && error !== "No branch ID provided") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-600">Cash Till - Error</CardTitle>
          <CardDescription>There was an issue loading the cash till</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If no cash account exists and we're not loading, show informative message
  if (!cashAccount && !isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cash Till</CardTitle>
          <CardDescription>No cash till account found for this branch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              No cash-in-till account has been set up for this branch.
            </p>
            <p className="text-xs text-muted-foreground">
              Please contact your administrator to set up a cash-in-till account.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Till</CardTitle>
        <CardDescription>Available cash for transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Balance:</span>
            <span className="text-2xl font-bold text-green-600">
              GHS{" "}
              {(cashAccount?.current_balance || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Threshold:</span>
              <span>
                GHS{" "}
                {(cashAccount?.min_threshold || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Threshold:</span>
              <span>
                GHS{" "}
                {(cashAccount?.max_threshold || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last Updated:</span>
              <span>{cashAccount?.updated_at ? new Date(cashAccount.updated_at).toLocaleString() : "N/A"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
