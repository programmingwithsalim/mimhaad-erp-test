"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react"
import type { ServiceStats } from "@/lib/services/dashboard-service"

interface FinanceDashboardProps {
  serviceStats: ServiceStats[]
  totalStats: any
  financialOverview: any
}

export function FinanceDashboard({ serviceStats, totalStats, financialOverview }: FinanceDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialOverview.netIncome)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialOverview.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Current margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operating Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialOverview.operatingExpenses)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialOverview.cashFlow)}</div>
            <p className="text-xs text-muted-foreground">Current flow</p>
          </CardContent>
        </Card>
      </div>

      {/* Float Management Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Float Management</CardTitle>
          <CardDescription>Float balances across all services and branches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceStats.map((service) => (
              <div key={service.service} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize">{service.service.replace("-", " ")}</h3>
                  <Badge variant={service.totalBalance > 10000 ? "default" : "destructive"}>
                    {service.totalBalance > 10000 ? "Healthy" : "Low"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold">{formatCurrency(service.totalBalance)}</p>
                  <p className="text-sm text-muted-foreground">Today's Volume: {formatCurrency(service.todayVolume)}</p>
                  <p className="text-sm text-muted-foreground">Fees Generated: {formatCurrency(service.todayFees)}</p>
                  <p className="text-sm text-muted-foreground">Transactions: {service.todayTransactions}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analysis</CardTitle>
          <CardDescription>Revenue breakdown by service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {serviceStats.map((service) => {
              const revenuePercentage =
                totalStats.totalRevenue > 0 ? (service.todayVolume / totalStats.totalRevenue) * 100 : 0

              return (
                <div key={service.service} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium capitalize">{service.service.replace("-", " ")}</h3>
                    <p className="text-sm text-muted-foreground">{service.todayTransactions} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(service.todayVolume)}</p>
                    <p className="text-sm text-muted-foreground">{revenuePercentage.toFixed(1)}% of total</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
