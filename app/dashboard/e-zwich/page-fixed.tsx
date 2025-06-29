"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, ArrowDownLeft, Building2, Wallet } from "lucide-react"
import { BranchIndicator } from "@/components/branch/branch-indicator"
import { EnhancedCardIssuanceFormComplete } from "@/components/e-zwich/enhanced-card-issuance-form-complete"
import { EnhancedWithdrawalFormVertical } from "@/components/e-zwich/enhanced-withdrawal-form-vertical"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useBranchFloatAccounts } from "@/hooks/use-branch-float-accounts"
import { formatCurrency } from "@/lib/currency"

export default function EZwichPageFixed() {
  const [activeTab, setActiveTab] = useState("card-issuance")
  const { user } = useCurrentUser()
  const { accounts: floatAccounts, loading: isLoadingFloatAccounts } = useBranchFloatAccounts()

  // Filter E-Zwich settlement accounts
  const ezwichAccounts = floatAccounts.filter(
    (account) =>
      account.is_active &&
      (account.account_type === "e-zwich" ||
        account.is_ezwich_partner ||
        account.provider.toLowerCase().includes("ezwich") ||
        account.provider.toLowerCase().includes("settlement")),
  )

  const totalEzwichBalance = ezwichAccounts.reduce((total, acc) => total + (acc.current_balance || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            E-Zwich Services - Fixed
          </h1>
          <p className="text-muted-foreground">Issue E-Zwich cards and process withdrawals</p>
        </div>
        <BranchIndicator />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Settlement Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ezwichAccounts.length}</div>
            <p className="text-xs text-muted-foreground">Active settlement accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Settlement Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEzwichBalance)}</div>
            <p className="text-xs text-muted-foreground">Available for withdrawals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Issued Today</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">New card issuances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals Today</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Cash withdrawals processed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card-issuance" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Card Issuance
          </TabsTrigger>
          <TabsTrigger value="withdrawal" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Cash Withdrawal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card-issuance" className="space-y-4">
          <EnhancedCardIssuanceFormComplete
            onSuccess={(data) => {
              console.log("Card issued successfully:", data)
              // Optionally switch to withdrawal tab or refresh data
            }}
          />
        </TabsContent>

        <TabsContent value="withdrawal" className="space-y-4">
          <EnhancedWithdrawalFormVertical
            onSuccess={(data) => {
              console.log("Withdrawal processed successfully:", data)
              // Optionally refresh balances or show receipt
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
