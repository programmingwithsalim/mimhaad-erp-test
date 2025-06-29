"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
import { Bar } from "react-chartjs-2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface RevenueData {
  service: string
  revenue: number
  transactions: number
}

export function RevenueChart() {
  const { theme } = useTheme()
  const [chartData, setChartData] = useState<any>(null)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard/transaction-data")
      const result = await response.json()

      if (result.success) {
        setRevenueData(result.data.revenueByService)
      } else {
        setError(result.error || "Failed to fetch revenue data")
        setRevenueData([])
      }
    } catch (err) {
      console.error("Error fetching revenue data:", err)
      setError("Failed to fetch revenue data")
      setRevenueData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (revenueData.length === 0) {
      setChartData(null)
      return
    }

    const labels = revenueData.map((item) => item.service)
    const data = revenueData.map((item) => item.revenue)

    // Set colors based on the current theme
    const barColors = [
      "rgba(56, 189, 248, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(34, 211, 238, 0.8)",
      "rgba(132, 204, 22, 0.8)",
    ]

    setChartData({
      labels,
      datasets: [
        {
          label: "Revenue",
          data,
          backgroundColor: barColors.slice(0, labels.length),
          borderRadius: 6,
          borderWidth: 0,
          barThickness: 24,
          maxBarThickness: 40,
        },
      ],
    })
  }, [revenueData, theme])

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
        titleColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        bodyColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const dataIndex = context.dataIndex
            const transactions = revenueData[dataIndex]?.transactions || 0
            return [`Revenue: GH₵${context.raw.toLocaleString()}`, `Transactions: ${transactions.toLocaleString()}`]
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
        grid: {
          color: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          callback: (value: number) => `GH₵${value.toLocaleString()}`,
        },
      },
    },
  }

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Revenue by Service</CardTitle>
          <CardDescription>Monthly revenue breakdown by service type</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Revenue by Service</CardTitle>
        <CardDescription>Monthly revenue breakdown by service type</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{error}</div>
          ) : chartData ? (
            <Bar data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No revenue data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
