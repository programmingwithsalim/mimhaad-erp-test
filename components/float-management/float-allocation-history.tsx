"use client"

import { useState } from "react"
import { useFloatStore } from "@/lib/float-management"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Download, Filter, Search } from "lucide-react"
import { format } from "date-fns"

export function FloatAllocationHistory() {
  const transactions = useFloatStore((state) =>
    state.transactions.filter(
      (tx) =>
        tx.transactionType === "allocation" ||
        tx.transactionType === "deduction" ||
        tx.transactionType === "adjustment",
    ),
  )

  const floatAccounts = useFloatStore((state) => state.floatAccounts)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterBranch, setFilterBranch] = useState<string>("all")
  const [filterService, setFilterService] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // Get unique branches
  const branches = Array.from(new Set(transactions.map((tx) => tx.branchId)))

  // Get unique services
  const services = Array.from(new Set(transactions.map((tx) => tx.serviceType)))

  // Get unique transaction types
  const transactionTypes = Array.from(new Set(transactions.map((tx) => tx.transactionType)))

  // Filter transactions
  const filteredTransactions = transactions
    .filter((tx) => {
      // Filter by branch
      if (filterBranch !== "all" && tx.branchId !== filterBranch) return false

      // Filter by service
      if (filterService !== "all" && tx.serviceType !== filterService) return false

      // Filter by transaction type
      if (filterType !== "all" && tx.transactionType !== filterType) return false

      // Filter by date range
      if (dateFrom && new Date(tx.timestamp) < dateFrom) return false
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (new Date(tx.timestamp) > endOfDay) return false
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const account = floatAccounts[tx.floatAccountId]
        const accountName = account
          ? `${account.branchId} ${account.serviceType} ${account.provider || ""}`.toLowerCase()
          : ""

        return (
          tx.branchId.toLowerCase().includes(query) ||
          tx.serviceType.toLowerCase().includes(query) ||
          (tx.provider && tx.provider.toLowerCase().includes(query)) ||
          (tx.notes && tx.notes.toLowerCase().includes(query)) ||
          tx.performedBy.toLowerCase().includes(query) ||
          accountName.includes(query)
        )
      }

      return true
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get transaction type badge
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "allocation":
        return <Badge className="bg-green-500">Allocation</Badge>
      case "deduction":
        return <Badge className="bg-blue-500">Deduction</Badge>
      case "adjustment":
        return <Badge className="bg-yellow-500">Adjustment</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  // Export transactions to CSV
  const exportTransactions = () => {
    const headers = [
      "Date",
      "Branch",
      "Service",
      "Provider",
      "Type",
      "Amount",
      "Previous Balance",
      "New Balance",
      "Notes",
      "Performed By",
    ]

    const csvRows = [
      headers.join(","),
      ...filteredTransactions.map((tx) => {
        return [
          new Date(tx.timestamp).toLocaleString(),
          tx.branchId,
          tx.serviceType,
          tx.provider || "N/A",
          tx.transactionType,
          tx.amount,
          tx.previousBalance,
          tx.newBalance,
          tx.notes ? `"${tx.notes.replace(/"/g, '""')}"` : "",
          tx.performedBy,
        ].join(",")
      }),
    ]

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `float_allocations_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search allocations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 max-w-[300px]"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {dateFrom ? format(dateFrom, "PP") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {dateTo ? format(dateTo, "PP") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="outline" size="sm" className="h-8" onClick={exportTransactions}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No allocation history found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.timestamp)}</TableCell>
                    <TableCell>{tx.branchId}</TableCell>
                    <TableCell>
                      {tx.serviceType} {tx.provider ? `(${tx.provider})` : ""}
                    </TableCell>
                    <TableCell>{getTransactionBadge(tx.transactionType)}</TableCell>
                    <TableCell className="text-right">
                      <span className={tx.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        {tx.amount >= 0 ? "+" : ""}
                        {formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(tx.newBalance)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={tx.notes || ""}>
                      {tx.notes || "-"}
                    </TableCell>
                    <TableCell>{tx.performedBy}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
