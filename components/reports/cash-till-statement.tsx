"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { RefreshCw, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"

interface CashTillTransaction {
  id: string
  date: string
  description: string
  transaction_type: string
  service_type: string
  amount: number | string
  balance_before: number
  balance_after: number
  reference?: string
  processed_by: string
  customer_name?: string
}

export function CashTillStatement() {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [transactions, setTransactions] = useState<CashTillTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterService, setFilterService] = useState("all")
  const [currentBalance, setCurrentBalance] = useState(0)

  const branchId = user?.branchId
  const branchName = user?.branchName || "Main Branch"

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !tx.description.toLowerCase().includes(query) &&
          !tx.reference?.toLowerCase().includes(query) &&
          !tx.customer_name?.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      if (filterType !== "all" && tx.transaction_type !== filterType) {
        return false
      }

      if (filterService !== "all" && tx.service_type !== filterService) {
        return false
      }

      return true
    })
  }, [transactions, searchQuery, filterType, filterService])

  // Fetch cash till transactions
  const fetchTransactions = async () => {
    if (!branchId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/cash-till/statement?branchId=${branchId}`)
      if (!response.ok) throw new Error("Failed to fetch cash till statement")

      const data = await response.json()
      setTransactions(data.transactions || [])
      setCurrentBalance(data.currentBalance || 0)
    } catch (error) {
      console.error("Error fetching cash till statement:", error)
      toast({
        title: "Error",
        description: "Failed to load cash till statement",
        variant: "destructive",
      })

      // Mock data for development
      const mockTransactions: CashTillTransaction[] = [
        {
          id: "ct-001",
          date: new Date().toISOString(),
          description: "MoMo Cash-In Transaction",
          transaction_type: "credit",
          service_type: "momo",
          amount: 100,
          balance_before: 5000,
          balance_after: 5100,
          reference: "MOMO12345",
          processed_by: "Admin User",
          customer_name: "John Doe",
        },
        {
          id: "ct-002",
          date: new Date(Date.now() - 3600000).toISOString(),
          description: "Agency Banking Withdrawal",
          transaction_type: "debit",
          service_type: "agency-banking",
          amount: 200,
          balance_before: 5100,
          balance_after: 4900,
          reference: "AB67890",
          processed_by: "Admin User",
          customer_name: "Jane Smith",
        },
      ]
      setTransactions(mockTransactions)
      setCurrentBalance(4900)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [branchId])

  // Export filtered transactions
  const exportStatement = () => {
    const headers = [
      "Date",
      "Description",
      "Type",
      "Service",
      "Amount",
      "Balance Before",
      "Balance After",
      "Reference",
      "Customer",
      "Processed By",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredTransactions.map((tx) =>
        [
          format(new Date(tx.date), "MMM dd, yyyy HH:mm"),
          `"${tx.description}"`,
          tx.transaction_type,
          tx.service_type,
          tx.amount,
          tx.balance_before,
          tx.balance_after,
          `"${tx.reference || ""}"`,
          `"${tx.customer_name || ""}"`,
          `"${tx.processed_by}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `cash-till-statement-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getTransactionTypeBadge = (type: string) => {
    return type === "credit" ? (
      <Badge className="bg-green-100 text-green-800">Credit</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Debit</Badge>
    )
  }

  const getServiceBadge = (service: string) => {
    const colors = {
      momo: "bg-blue-100 text-blue-800",
      "agency-banking": "bg-purple-100 text-purple-800",
      "e-zwich": "bg-green-100 text-green-800",
      power: "bg-yellow-100 text-yellow-800",
      jumia: "bg-orange-100 text-orange-800",
    }

    return <Badge className={colors[service] || "bg-gray-100 text-gray-800"}>{service.toUpperCase()}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Cash in Till Statement</CardTitle>
            <CardDescription>Track all cash till transactions for {branchName}</CardDescription>
            <div className="mt-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Current Balance: {formatCurrency(Number(currentBalance) || 0)}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportStatement}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by description, reference, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filterType">Transaction Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filterType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterService">Service</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger id="filterService">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="momo">MoMo</SelectItem>
                  <SelectItem value="agency-banking">Agency Banking</SelectItem>
                  <SelectItem value="e-zwich">E-Zwich</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="jumia">Jumia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance Before</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <div className="flex justify-center items-center">
                        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading transactions...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <span className="text-sm text-muted-foreground">No cash till transactions found.</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(tx.date), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{getTransactionTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell>{getServiceBadge(tx.service_type)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={tx.transaction_type === "credit" ? "text-green-600" : "text-red-600"}>
                          {tx.transaction_type === "credit" ? "+" : "-"}
                          {formatCurrency(Number(tx.amount) || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(tx.balance_before)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(tx.balance_after)}</TableCell>
                      <TableCell>{tx.reference || "N/A"}</TableCell>
                      <TableCell>{tx.customer_name || "N/A"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
