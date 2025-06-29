"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { TrendingUp, DollarSign, FileText, Download, Calendar, Building, Users, Activity } from "lucide-react"

interface FinancialData {
  incomeStatement: {
    revenue: number
    expenses: number
    netIncome: number
    grossProfit: number
    operatingIncome: number
  }
  balanceSheet: {
    totalAssets: number
    totalLiabilities: number
    equity: number
    currentAssets: number
    currentLiabilities: number
  }
  cashFlow: {
    operatingCashFlow: number
    investingCashFlow: number
    financingCashFlow: number
    netCashFlow: number
  }
  kpis: {
    currentRatio: number
    debtToEquity: number
    returnOnAssets: number
    returnOnEquity: number
  }
  trends: Array<{
    month: string
    revenue: number
    expenses: number
    netIncome: number
  }>
  breakdown: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function FinancialReportsEnhanced() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")
  const [selectedBranch, setSelectedBranch] = useState("all")

  useEffect(() => {
    fetchFinancialData()
  }, [selectedPeriod, selectedBranch])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)

      // Mock data for demonstration
      const mockData: FinancialData = {
        incomeStatement: {
          revenue: 125000,
          expenses: 85000,
          netIncome: 40000,
          grossProfit: 95000,
          operatingIncome: 45000,
        },
        balanceSheet: {
          totalAssets: 500000,
          totalLiabilities: 200000,
          equity: 300000,
          currentAssets: 150000,
          currentLiabilities: 75000,
        },
        cashFlow: {
          operatingCashFlow: 35000,
          investingCashFlow: -15000,
          financingCashFlow: -5000,
          netCashFlow: 15000,
        },
        kpis: {
          currentRatio: 2.0,
          debtToEquity: 0.67,
          returnOnAssets: 0.08,
          returnOnEquity: 0.13,
        },
        trends: [
          { month: "Jan", revenue: 100000, expenses: 70000, netIncome: 30000 },
          { month: "Feb", revenue: 110000, expenses: 75000, netIncome: 35000 },
          { month: "Mar", revenue: 125000, expenses: 85000, netIncome: 40000 },
          { month: "Apr", revenue: 115000, expenses: 80000, netIncome: 35000 },
          { month: "May", revenue: 130000, expenses: 90000, netIncome: 40000 },
          { month: "Jun", revenue: 140000, expenses: 95000, netIncome: 45000 },
        ],
        breakdown: [
          { category: "Service Revenue", amount: 75000, percentage: 60 },
          { category: "Commission Income", amount: 30000, percentage: 24 },
          { category: "Transaction Fees", amount: 15000, percentage: 12 },
          { category: "Other Income", amount: 5000, percentage: 4 },
        ],
      }

      setData(mockData)
    } catch (error) {
      console.error("Error fetching financial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const exportReport = async (format: "pdf" | "excel") => {
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "financial-enhanced",
          format,
          period: selectedPeriod,
          branch: selectedBranch,
          data,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `financial-report-${format}.${format === "pdf" ? "pdf" : "xlsx"}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No financial data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Comprehensive financial analysis and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReport("excel")}>
            <FileText className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="main">Main Branch</SelectItem>
                  <SelectItem value="north">North Branch</SelectItem>
                  <SelectItem value="south">South Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(data.incomeStatement.revenue)}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-green-600">
                +12.5%
              </Badge>
              <span className="text-sm text-muted-foreground ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <p className="text-2xl font-bold">{formatCurrency(data.incomeStatement.netIncome)}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-blue-600">
                +8.3%
              </Badge>
              <span className="text-sm text-muted-foreground ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(data.balanceSheet.totalAssets)}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-purple-600">
                +5.2%
              </Badge>
              <span className="text-sm text-muted-foreground ml-2">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Ratio</p>
                <p className="text-2xl font-bold">{data.kpis.currentRatio.toFixed(2)}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="secondary" className="text-green-600">
                Healthy
              </Badge>
              <span className="text-sm text-muted-foreground ml-2">liquidity ratio</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Statements */}
      <Tabs defaultValue="income-statement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income Statement</CardTitle>
                <CardDescription>Revenue and expense breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Revenue</span>
                    <span className="font-bold text-green-600">{formatCurrency(data.incomeStatement.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gross Profit</span>
                    <span>{formatCurrency(data.incomeStatement.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Operating Income</span>
                    <span>{formatCurrency(data.incomeStatement.operatingIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Expenses</span>
                    <span className="text-red-600">{formatCurrency(data.incomeStatement.expenses)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Net Income</span>
                    <span className="font-bold text-blue-600">{formatCurrency(data.incomeStatement.netIncome)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue sources distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.breakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {data.breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Assets</CardTitle>
                <CardDescription>Current and total assets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Current Assets</span>
                    <span className="font-bold">{formatCurrency(data.balanceSheet.currentAssets)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Assets</span>
                    <span className="font-bold text-blue-600">{formatCurrency(data.balanceSheet.totalAssets)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liabilities & Equity</CardTitle>
                <CardDescription>Financial obligations and equity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Current Liabilities</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(data.balanceSheet.currentLiabilities)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Liabilities</span>
                    <span className="font-bold text-red-600">{formatCurrency(data.balanceSheet.totalLiabilities)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Equity</span>
                    <span className="font-bold text-green-600">{formatCurrency(data.balanceSheet.equity)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>Cash inflows and outflows by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Operating</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(data.cashFlow.operatingCashFlow)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Investing</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.cashFlow.investingCashFlow)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Financing</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(data.cashFlow.financingCashFlow)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.cashFlow.netCashFlow)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
              <CardDescription>Revenue, expenses, and net income over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#82ca9d" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="netIncome" stroke="#ffc658" strokeWidth={2} name="Net Income" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Indicators</CardTitle>
          <CardDescription>Financial ratios and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Current Ratio</p>
              <p className="text-2xl font-bold">{data.kpis.currentRatio.toFixed(2)}</p>
              <Badge variant="secondary" className="mt-2">
                {data.kpis.currentRatio >= 2 ? "Excellent" : data.kpis.currentRatio >= 1.5 ? "Good" : "Poor"}
              </Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Debt-to-Equity</p>
              <p className="text-2xl font-bold">{data.kpis.debtToEquity.toFixed(2)}</p>
              <Badge variant="secondary" className="mt-2">
                {data.kpis.debtToEquity <= 0.5 ? "Low Risk" : data.kpis.debtToEquity <= 1 ? "Moderate" : "High Risk"}
              </Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Return on Assets</p>
              <p className="text-2xl font-bold">{formatPercentage(data.kpis.returnOnAssets)}</p>
              <Badge variant="secondary" className="mt-2">
                {data.kpis.returnOnAssets >= 0.1 ? "Excellent" : data.kpis.returnOnAssets >= 0.05 ? "Good" : "Poor"}
              </Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Return on Equity</p>
              <p className="text-2xl font-bold">{formatPercentage(data.kpis.returnOnEquity)}</p>
              <Badge variant="secondary" className="mt-2">
                {data.kpis.returnOnEquity >= 0.15 ? "Excellent" : data.kpis.returnOnEquity >= 0.1 ? "Good" : "Poor"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FinancialReportsEnhanced
