"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { CalendarIcon, Download, Printer, RefreshCw, TrendingUp, TrendingDown, FileText, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReportsDashboardProps {
  initialDateRange?: { from: Date; to: Date }
  initialBranch?: string
}

export function ReportsDashboard({
  initialDateRange = {
    from: startOfMonth(new Date()),
    to: new Date(),
  },
  initialBranch = "all",
}: ReportsDashboardProps) {
  const [dateRange, setDateRange] = useState(initialDateRange)
  const [branch, setBranch] = useState(initialBranch)
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchBranches()
    fetchReportData()
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [dateRange, branch])

  const fetchBranches = async () => {
    try {
      const response = await fetch("/api/branches")
      const result = await response.json()
      if (result.success) {
        setBranches(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching branches:", error)
    }
  }

  const fetchReportData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        branch: branch,
      })

      const response = await fetch(`/api/reports/dashboard-summary?${params}`)
      const result = await response.json()

      if (result.success) {
        setReportData(result.data)
      } else {
        throw new Error(result.error || "Failed to fetch report data")
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const setQuickDateRange = (days: number) => {
    const to = new Date()
    const from = subDays(to, days)
    setDateRange({ from, to })
  }

  const setMonthRange = (monthsBack: number) => {
    const date = subMonths(new Date(), monthsBack)
    setDateRange({
      from: startOfMonth(date),
      to: endOfMonth(date),
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const exportReport = async (format: "pdf" | "excel") => {
    try {
      const params = new URLSearchParams({
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        branch: branch,
        format: format,
      })

      const response = await fetch(`/api/reports/export?${params}`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `financial-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">Comprehensive financial analysis and reporting dashboard</p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-end md:space-x-4 md:space-y-0">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left md:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => range && setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Quick Date Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Select</label>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                  7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                  30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonthRange(0)}>
                  This Month
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonthRange(1)}>
                  Last Month
                </Button>
              </div>
            </div>

            {/* Branch Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={fetchReportData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => exportReport("pdf")}>
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => exportReport("excel")}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(reportData.summary?.total_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.summary?.revenue_change >= 0 ? "+" : ""}
                {reportData.summary?.revenue_change?.toFixed(1)}% from previous period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(reportData.summary?.total_expenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {reportData.summary?.expense_change >= 0 ? "+" : ""}
                {reportData.summary?.expense_change?.toFixed(1)}% from previous period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              {reportData.summary?.net_income >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  reportData.summary?.net_income >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(reportData.summary?.net_income || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Profit margin: {reportData.summary?.profit_margin?.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Position</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(reportData.summary?.cash_position || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Available across all accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Status */}
      {reportData?.sync_status && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={reportData.sync_status.is_synced ? "default" : "secondary"}>
                  {reportData.sync_status.is_synced ? "✅ Data Synchronized" : "⏳ Sync Pending"}
                </Badge>
                {reportData.sync_status.last_sync && (
                  <span className="text-sm text-muted-foreground">
                    Last updated: {format(new Date(reportData.sync_status.last_sync), "PPp")}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">Report generated: {format(new Date(), "PPp")}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
