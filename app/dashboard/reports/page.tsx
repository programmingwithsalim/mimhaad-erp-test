"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, FileText, TrendingUp, BarChart3, PieChart } from "lucide-react"
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"
import { BranchIndicator } from "@/components/branch/branch-indicator"
import { ReportsDashboard } from "@/components/reports/reports-dashboard"
import { IncomeStatement } from "@/components/reports/income-statement"
import { BalanceSheet } from "@/components/reports/balance-sheet"
import { CashFlowStatement } from "@/components/reports/cash-flow-statement"
import { ReconciliationReport } from "@/components/reports/reconciliation-report"

export default function ReportsPage() {
  const { user } = useCurrentUser()
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: new Date(),
  })
  const [selectedBranch, setSelectedBranch] = useState("all")

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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Financial Reports
          </h1>
          <p className="text-muted-foreground">Generate and view comprehensive financial reports</p>
        </div>
        <BranchIndicator />
      </div>

      {/* Report Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
          <CardDescription>Select date range and branch for report generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-end md:space-x-4 md:space-y-0">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left md:w-auto", !dateRange && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
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
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {user?.branchId && (
                    <SelectItem value={user.branchId}>{user.branchName || "Current Branch"}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Reports Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reconciliation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ReportsDashboard initialDateRange={dateRange} initialBranch={selectedBranch} />
        </TabsContent>

        <TabsContent value="income-statement">
          <IncomeStatement dateRange={dateRange} branch={selectedBranch} />
        </TabsContent>

        <TabsContent value="balance-sheet">
          <BalanceSheet date={dateRange.to} branch={selectedBranch} />
        </TabsContent>

        <TabsContent value="cash-flow">
          <CashFlowStatement dateRange={dateRange} branch={selectedBranch} />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationReport dateRange={dateRange} branch={selectedBranch} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
