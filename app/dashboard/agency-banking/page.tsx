"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useServiceStatistics } from "@/hooks/use-service-statistics"
import { DynamicFloatDisplay } from "@/components/shared/dynamic-float-display"
import { Building2, TrendingUp, DollarSign, Users, RefreshCw, Plus, Download, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

export default function AgencyBankingPage() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const { statistics, floatAlerts, isLoading: statsLoading, refreshStatistics } = useServiceStatistics("agency-banking")

  const [submitting, setSubmitting] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [floatAccounts, setFloatAccounts] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [loadingFloats, setLoadingFloats] = useState(false)

  const [formData, setFormData] = useState({
    type: "",
    amount: "",
    fee: "",
    customer_name: "",
    account_number: "",
    partner_bank: "",
    notes: "",
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount || 0)
  }

  const loadTransactions = async () => {
    if (!user?.branchId) return

    try {
      setLoadingTransactions(true)
      const response = await fetch(`/api/agency-banking/transactions?branchId=${user.branchId}&limit=50`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions)
        } else {
          setTransactions([])
        }
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error("Error loading agency banking transactions:", error)
      setTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

  const loadFloatAccounts = async () => {
    if (!user?.branchId) return

    try {
      setLoadingFloats(true)
      const response = await fetch(`/api/float-accounts?branchId=${user.branchId}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.accounts)) {
          // Filter for Agency Banking accounts
          const agencyAccounts = data.accounts.filter(
            (account: any) =>
              account.account_type === "agency-banking" ||
              account.provider?.toLowerCase().includes("bank") ||
              account.provider?.toLowerCase().includes("gcb") ||
              account.provider?.toLowerCase().includes("ecobank") ||
              account.provider?.toLowerCase().includes("absa"),
          )
          setFloatAccounts(agencyAccounts)
        } else {
          setFloatAccounts([])
        }
      } else {
        setFloatAccounts([])
      }
    } catch (error) {
      console.error("Error loading float accounts:", error)
      setFloatAccounts([])
    } finally {
      setLoadingFloats(false)
    }
  }

  useEffect(() => {
    if (user?.branchId) {
      loadTransactions()
      loadFloatAccounts()
    }
  }, [user?.branchId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch("/api/agency-banking/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
          fee: Number.parseFloat(formData.fee || "0"),
          branchId: user.branchId,
          userId: user.id,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Transaction Successful",
          description: "Agency banking transaction created successfully",
        })
        setFormData({
          type: "",
          amount: "",
          fee: "",
          customer_name: "",
          account_number: "",
          partner_bank: "",
          notes: "",
        })
        // Refresh data
        loadTransactions()
        loadFloatAccounts()
        refreshStatistics()
      } else {
        toast({
          title: "Transaction Failed",
          description: result.error || "Failed to create transaction",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast({
        title: "Transaction Failed",
        description: "Failed to create transaction",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Customer", "Account Number", "Partner Bank", "Amount", "Fee", "Status"]
    const csvData = transactions.map((transaction: any) => [
      format(new Date(transaction.created_at || new Date()), "yyyy-MM-dd HH:mm:ss"),
      transaction.type,
      transaction.customer_name || "",
      transaction.account_number || "",
      transaction.partner_bank || "",
      transaction.amount ? Number.parseFloat(transaction.amount).toFixed(2) : "0.00",
      transaction.fee ? Number.parseFloat(transaction.fee).toFixed(2) : "0.00",
      transaction.status || "completed",
    ])

    const csvContent = [headers, ...csvData].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `agency-banking-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Successful",
      description: `Exported ${transactions.length} transactions to CSV`,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <Badge variant="default">Completed</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agency Banking Services</h1>
          <p className="text-muted-foreground">Manage agency banking transactions and partner bank operations</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            loadTransactions()
            loadFloatAccounts()
            refreshStatistics()
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Float Alerts */}
      {floatAlerts.length > 0 && (
        <div className="space-y-2">
          {floatAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.severity === "critical" ? "border-l-red-500 bg-red-50" : "border-l-yellow-500 bg-yellow-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${alert.severity === "critical" ? "text-red-600" : "text-yellow-600"}`}
                />
                <span className="font-medium">
                  {alert.provider} float balance is {alert.severity}: {formatCurrency(alert.current_balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">Total: {statistics.totalTransactions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.todayVolume)}</div>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(statistics.totalVolume)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.todayCommission)}</div>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(statistics.totalCommission)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partner Banks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.activeProviders}</div>
            <p className="text-xs text-muted-foreground">Float: {formatCurrency(statistics.floatBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transaction" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transaction">New Transaction</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="transaction" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction Form - 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Create Agency Banking Transaction
                  </CardTitle>
                  <CardDescription>Process a new agency banking transaction</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="type">Transaction Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transaction type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deposit">Deposit</SelectItem>
                            <SelectItem value="withdrawal">Withdrawal</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                            <SelectItem value="balance_inquiry">Balance Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="partner_bank">Partner Bank</Label>
                        <Select
                          value={formData.partner_bank}
                          onValueChange={(value) => setFormData({ ...formData, partner_bank: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select partner bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GCB">GCB Bank</SelectItem>
                            <SelectItem value="Ecobank">Ecobank Ghana</SelectItem>
                            <SelectItem value="Standard Chartered">Standard Chartered</SelectItem>
                            <SelectItem value="Absa">Absa Bank Ghana</SelectItem>
                            <SelectItem value="Fidelity">Fidelity Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer_name">Customer Name</Label>
                        <Input
                          id="customer_name"
                          value={formData.customer_name}
                          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                          placeholder="Enter customer name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          value={formData.account_number}
                          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                          placeholder="Enter account number"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (GHS)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fee">Fee (GHS)</Label>
                        <Input
                          id="fee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.fee}
                          onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Transaction
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Float Display - 1 column */}
            <div className="lg:col-span-1">
              <DynamicFloatDisplay
                selectedProvider={formData.partner_bank}
                floatAccounts={floatAccounts}
                serviceType="Agency Banking"
                onRefresh={loadFloatAccounts}
                isLoading={loadingFloats}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All agency banking transactions</CardDescription>
                </div>
                <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                  <p className="text-muted-foreground">No agency banking transactions have been processed yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Partner Bank</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.created_at || new Date()), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="capitalize">{transaction.type}</TableCell>
                        <TableCell>{transaction.customer_name || "-"}</TableCell>
                        <TableCell>{transaction.account_number || "-"}</TableCell>
                        <TableCell>{transaction.partner_bank || "-"}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount || 0)}</TableCell>
                        <TableCell>{formatCurrency(transaction.fee || 0)}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
