"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
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
import { Line } from "react-chartjs-2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// Time period options
const TIME_PERIODS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
]

interface TransactionData {
  date: string
  amount: number
  count: number
}

export function TransactionChart() {
  const { theme } = useTheme()
  const [activeTimePeriod, setActiveTimePeriod] = useState(TIME_PERIODS[1]) // Default to 30 days
  const [chartData, setChartData] = useState<any>(null)
  const [transactionData, setTransactionData] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch transaction data from API
  useEffect(() => {
    fetchTransactionData()
  }, [activeTimePeriod])

  const fetchTransactionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/transaction-data?days=${activeTimePeriod.days}`)
      const result = await response.json()

      if (result.success) {
        setTransactionData(result.data.dailyTransactions)
      } else {
        setError(result.error || "Failed to fetch transaction data")
        setTransactionData([])
      }
    } catch (err) {
      console.error("Error fetching transaction data:", err)
      setError("Failed to fetch transaction data")
      setTransactionData([])
    } finally {
      setLoading(false)
    }
  }

  // Update chart data when transaction data or theme changes
  useEffect(() => {
    if (transactionData.length === 0) {
      setChartData(null)
      return
    }

    const labels = transactionData.map((item) => {
      const date = new Date(item.date)
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    })

    const data = transactionData.map((item) => item.amount)

    // Set colors based on the current theme
    const isDark = theme === "dark"
    const lineColor = isDark ? "rgba(56, 189, 248, 1)" : "rgba(56, 189, 248, 1)"
    const gradientStart = isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.2)"
    const gradientEnd = isDark ? "rgba(56, 189, 248, 0)" : "rgba(56, 189, 248, 0)"

    setChartData({
      labels,
      datasets: [
        {
          label: "Transaction Volume",
          data,
          borderColor: lineColor,
          backgroundColor: (context: any) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return null

            // Create gradient fill
            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
            gradient.addColorStop(0, gradientEnd)
            gradient.addColorStop(1, gradientStart)
            return gradient
          },
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: lineColor,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    })
  }, [transactionData, theme])

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
        titleColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        bodyColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        callbacks: {
          label: (context: any) => {
            const dataIndex = context.dataIndex
            const transactionCount = transactionData[dataIndex]?.count || 0
            return [`Volume: GH₵${context.raw.toLocaleString()}`, `Transactions: ${transactionCount.toLocaleString()}`]
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
          maxTicksLimit: 7,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          callback: (value: number) => `GH₵${value.toLocaleString()}`,
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
      },
    },
  }

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Transaction Volume</CardTitle>
            <CardDescription>Daily transaction volume over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {TIME_PERIODS.map((period) => (
              <Skeleton key={period.label} className="h-7 w-12" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Daily transaction volume over time</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {TIME_PERIODS.map((period) => (
            <Button
              key={period.label}
              variant={activeTimePeriod.label === period.label ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTimePeriod(period)}
              className="h-7 px-3"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{error}</div>
          ) : chartData ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No transaction data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
