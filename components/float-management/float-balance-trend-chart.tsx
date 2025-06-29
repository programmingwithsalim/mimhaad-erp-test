"use client"

import { useState, useEffect } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface FloatBalanceTrendChartProps {
  className?: string
}

type TimeRange = "7days" | "30days" | "90days" | "1year"

interface DailyBalance {
  date: string
  totalBalance: number
  momoBalance: number
  agencyBankingBalance: number
  eZwichBalance: number
  otherBalance: number
}

export function FloatBalanceTrendChart({ className }: FloatBalanceTrendChartProps) {
  const [balanceData, setBalanceData] = useState<DailyBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("30days")

  useEffect(() => {
    fetchBalanceTrend()
  }, [timeRange])

  const fetchBalanceTrend = async () => {
    setLoading(true)
    setError(null)

    try {
      // In a real implementation, we would fetch from an API with the timeRange parameter
      // For now, we'll generate mock data
      const mockData = generateMockBalanceData(timeRange)
      setBalanceData(mockData)
    } catch (err) {
      console.error("Error fetching float balance trend:", err)
      setError(err instanceof Error ? err.message : "Failed to load balance trend data")
    } finally {
      setLoading(false)
    }
  }

  // Generate mock data for demonstration
  const generateMockBalanceData = (range: TimeRange): DailyBalance[] => {
    const data: DailyBalance[] = []
    const now = new Date()
    let days: number

    switch (range) {
      case "7days":
        days = 7
        break
      case "30days":
        days = 30
        break
      case "90days":
        days = 90
        break
      case "1year":
        days = 365
        break
    }

    // Generate a starting balance between 100,000 and 200,000
    let baseBalance = 150000 + Math.random() * 50000

    // Generate data points
    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      // Add some random variation to create a realistic trend
      const dailyChange = (Math.random() - 0.48) * 10000 // Slightly biased toward growth
      baseBalance += dailyChange

      // Ensure balance doesn't go below a reasonable amount
      baseBalance = Math.max(baseBalance, 50000)

      // Distribute the total balance across different account types
      const momoPercent = 0.4 + Math.random() * 0.1 // 40-50%
      const agencyPercent = 0.25 + Math.random() * 0.1 // 25-35%
      const eZwichPercent = 0.15 + Math.random() * 0.05 // 15-20%
      const otherPercent = 1 - momoPercent - agencyPercent - eZwichPercent

      data.push({
        date: date.toISOString().split("T")[0],
        totalBalance: Math.round(baseBalance),
        momoBalance: Math.round(baseBalance * momoPercent),
        agencyBankingBalance: Math.round(baseBalance * agencyPercent),
        eZwichBalance: Math.round(baseBalance * eZwichPercent),
        otherBalance: Math.round(baseBalance * otherPercent),
      })
    }

    return data
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(date)
  }

  // Prepare chart data
  const chartData = {
    labels: balanceData.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: "Total Float",
        data: balanceData.map((item) => item.totalBalance),
        borderColor: "rgba(99, 102, 241, 1)", // indigo-500
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: balanceData.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
      },
      {
        label: "Mobile Money",
        data: balanceData.map((item) => item.momoBalance),
        borderColor: "rgba(34, 197, 94, 1)", // green-500
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: balanceData.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
      },
      {
        label: "Agency Banking",
        data: balanceData.map((item) => item.agencyBankingBalance),
        borderColor: "rgba(249, 115, 22, 1)", // orange-500
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: balanceData.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
      },
      {
        label: "E-Zwich",
        data: balanceData.map((item) => item.eZwichBalance),
        borderColor: "rgba(236, 72, 153, 1)", // pink-500
        backgroundColor: "rgba(236, 72, 153, 0.1)",
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: balanceData.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
      },
    ],
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => {
            return formatCurrency(value)
          },
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
  }

  // Get time range label
  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case "7days":
        return "7 Days"
      case "30days":
        return "30 Days"
      case "90days":
        return "90 Days"
      case "1year":
        return "1 Year"
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Float Balance Trend</CardTitle>
          <CardDescription>Historical float balance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading chart data</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchBalanceTrend} className="mt-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Float Balance Trend</CardTitle>
            <CardDescription>
              {loading ? "Loading float balance trend data..." : "Historical float balance over time"}
            </CardDescription>
          </div>

          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <TabsList className="h-8">
              <TabsTrigger value="7days" className="text-xs px-2">
                7 Days
              </TabsTrigger>
              <TabsTrigger value="30days" className="text-xs px-2">
                30 Days
              </TabsTrigger>
              <TabsTrigger value="90days" className="text-xs px-2">
                90 Days
              </TabsTrigger>
              <TabsTrigger value="1year" className="text-xs px-2">
                1 Year
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : (
          <div className="h-[350px] relative">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {!loading && balanceData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex flex-col p-2 border rounded-md">
              <span className="text-xs text-muted-foreground">Current Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(balanceData[balanceData.length - 1].totalBalance)}
              </span>
            </div>
            <div className="flex flex-col p-2 border rounded-md">
              <span className="text-xs text-muted-foreground">30-Day Change</span>
              {balanceData.length > 30 ? (
                <span
                  className={`text-lg font-bold ${balanceData[balanceData.length - 1].totalBalance > balanceData[balanceData.length - 31].totalBalance ? "text-green-500" : "text-red-500"}`}
                >
                  {(
                    (balanceData[balanceData.length - 1].totalBalance /
                      balanceData[balanceData.length - 31].totalBalance -
                      1) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              ) : (
                <span className="text-lg font-bold">N/A</span>
              )}
            </div>
            <div className="flex flex-col p-2 border rounded-md">
              <span className="text-xs text-muted-foreground">Highest Balance</span>
              <span className="text-lg font-bold">
                {formatCurrency(Math.max(...balanceData.map((item) => item.totalBalance)))}
              </span>
            </div>
            <div className="flex flex-col p-2 border rounded-md">
              <span className="text-xs text-muted-foreground">Lowest Balance</span>
              <span className="text-lg font-bold">
                {formatCurrency(Math.min(...balanceData.map((item) => item.totalBalance)))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
