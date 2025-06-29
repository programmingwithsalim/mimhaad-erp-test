"use client"

import { useState, useEffect } from "react"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface TransactionVolumeChartProps {
  className?: string
}

type TimeRange = "7days" | "30days" | "90days" | "1year"
type ViewMode = "count" | "amount"

interface ServiceVolume {
  service: string
  count: number
  amount: number
}

interface DailyVolume {
  date: string
  services: {
    momo: ServiceVolume
    agencyBanking: ServiceVolume
    eZwich: ServiceVolume
    power: ServiceVolume
    jumia: ServiceVolume
  }
}

export function TransactionVolumeChart({ className }: TransactionVolumeChartProps) {
  const [volumeData, setVolumeData] = useState<DailyVolume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("30days")
  const [viewMode, setViewMode] = useState<ViewMode>("count")

  useEffect(() => {
    fetchTransactionVolume()
  }, [timeRange])

  const fetchTransactionVolume = async () => {
    setLoading(true)
    setError(null)

    try {
      // In a real implementation, we would fetch from an API with the timeRange parameter
      // For now, we'll generate mock data
      const mockData = generateMockVolumeData(timeRange)
      setVolumeData(mockData)
    } catch (err) {
      console.error("Error fetching transaction volume data:", err)
      setError(err instanceof Error ? err.message : "Failed to load transaction volume data")
    } finally {
      setLoading(false)
    }
  }

  // Generate mock data for demonstration
  const generateMockVolumeData = (range: TimeRange): DailyVolume[] => {
    const data: DailyVolume[] = []
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

    // Generate data points
    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      // Generate random volumes with some weekly patterns
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const multiplier = isWeekend ? 0.7 : 1.0 + (dayOfWeek === 1 ? 0.2 : 0) // Less on weekends, more on Mondays

      data.push({
        date: date.toISOString().split("T")[0],
        services: {
          momo: {
            service: "Mobile Money",
            count: Math.round((80 + Math.random() * 40) * multiplier), // 80-120 transactions
            amount: Math.round((25000 + Math.random() * 15000) * multiplier), // GHS 25,000-40,000
          },
          agencyBanking: {
            service: "Agency Banking",
            count: Math.round((40 + Math.random() * 30) * multiplier), // 40-70 transactions
            amount: Math.round((35000 + Math.random() * 20000) * multiplier), // GHS 35,000-55,000
          },
          eZwich: {
            service: "E-Zwich",
            count: Math.round((20 + Math.random() * 15) * multiplier), // 20-35 transactions
            amount: Math.round((15000 + Math.random() * 10000) * multiplier), // GHS 15,000-25,000
          },
          power: {
            service: "Power",
            count: Math.round((30 + Math.random() * 20) * multiplier), // 30-50 transactions
            amount: Math.round((8000 + Math.random() * 4000) * multiplier), // GHS 8,000-12,000
          },
          jumia: {
            service: "Jumia",
            count: Math.round((10 + Math.random() * 10) * multiplier), // 10-20 transactions
            amount: Math.round((5000 + Math.random() * 3000) * multiplier), // GHS 5,000-8,000
          },
        },
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

  // Aggregate data by service
  const aggregateByService = () => {
    const services = ["momo", "agencyBanking", "eZwich", "power", "jumia"] as const
    const serviceLabels = ["Mobile Money", "Agency Banking", "E-Zwich", "Power", "Jumia"]

    const aggregated = services.map((service, index) => {
      const totalCount = volumeData.reduce((sum, day) => sum + day.services[service].count, 0)
      const totalAmount = volumeData.reduce((sum, day) => sum + day.services[service].amount, 0)

      return {
        label: serviceLabels[index],
        count: totalCount,
        amount: totalAmount,
      }
    })

    return aggregated
  }

  // Prepare chart data
  const getChartData = () => {
    const aggregated = aggregateByService()

    return {
      labels: aggregated.map((item) => item.label),
      datasets: [
        {
          label: viewMode === "count" ? "Transaction Count" : "Transaction Amount",
          data: aggregated.map((item) => (viewMode === "count" ? item.count : item.amount)),
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)", // green-500
            "rgba(249, 115, 22, 0.8)", // orange-500
            "rgba(236, 72, 153, 0.8)", // pink-500
            "rgba(59, 130, 246, 0.8)", // blue-500
            "rgba(139, 92, 246, 0.8)", // violet-500
          ],
          borderColor: [
            "rgba(34, 197, 94, 1)",
            "rgba(249, 115, 22, 1)",
            "rgba(236, 72, 153, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(139, 92, 246, 1)",
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  // Chart options
  const getChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              if (viewMode === "count") {
                return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} transactions`
              } else {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
              }
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => {
              if (viewMode === "count") {
                return value.toLocaleString()
              } else {
                return formatCurrency(value)
              }
            },
          },
        },
      },
    }
  }

  // Calculate totals
  const calculateTotals = () => {
    if (volumeData.length === 0) return { totalCount: 0, totalAmount: 0 }

    const totalCount = volumeData.reduce((sum, day) => {
      return (
        sum +
        day.services.momo.count +
        day.services.agencyBanking.count +
        day.services.eZwich.count +
        day.services.power.count +
        day.services.jumia.count
      )
    }, 0)

    const totalAmount = volumeData.reduce((sum, day) => {
      return (
        sum +
        day.services.momo.amount +
        day.services.agencyBanking.amount +
        day.services.eZwich.amount +
        day.services.power.amount +
        day.services.jumia.amount
      )
    }, 0)

    return { totalCount, totalAmount }
  }

  const { totalCount, totalAmount } = calculateTotals()

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Transaction volume by service type</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading chart data</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTransactionVolume} className="mt-2">
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
            <CardTitle>Transaction Volume</CardTitle>
            <CardDescription>
              {loading
                ? "Loading transaction volume data..."
                : `${getTimeRangeLabel(timeRange)} transaction volume by service type`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="count" className="text-xs px-2">
                  Count
                </TabsTrigger>
                <TabsTrigger value="amount" className="text-xs px-2">
                  Amount
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : (
          <div className="h-[350px] relative">
            <Bar data={getChartData()} options={getChartOptions()} />
          </div>
        )}

        {!loading && volumeData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex flex-col p-2 border rounded-md">
              <span className="text-xs text-muted-foreground">Total Transactions</span>
              <span className="text-lg font-bold">{totalCount.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{`${getTimeRangeLabel(timeRange)} period`}</span>
            </div>
            <div className="flex flex-col p-2 border rounded-md">
              <span className="text-xs text-muted-foreground">Total Volume</span>
              <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              <span className="text-xs text-muted-foreground">{`${getTimeRangeLabel(timeRange)} period`}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to get time range label
function getTimeRangeLabel(range: TimeRange): string {
  switch (range) {
    case "7days":
      return "Last 7 days"
    case "30days":
      return "Last 30 days"
    case "90days":
      return "Last 90 days"
    case "1year":
      return "Last year"
  }
}
