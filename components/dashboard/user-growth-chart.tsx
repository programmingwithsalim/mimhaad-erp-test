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
import { Skeleton } from "@/components/ui/skeleton"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface UserGrowthData {
  month: string
  newUsers: number
  totalUsers: number
}

export function UserGrowthChart() {
  const { theme } = useTheme()
  const [chartData, setChartData] = useState<any>(null)
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserGrowthData()
  }, [])

  const fetchUserGrowthData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard/user-growth")
      const result = await response.json()

      if (result.success) {
        setUserGrowthData(result.data.monthlyGrowth)
      } else {
        setError(result.error || "Failed to fetch user growth data")
        setUserGrowthData([])
      }
    } catch (err) {
      console.error("Error fetching user growth data:", err)
      setError("Failed to fetch user growth data")
      setUserGrowthData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userGrowthData.length === 0) {
      setChartData(null)
      return
    }

    const labels = userGrowthData.map((item) => item.month)
    const data = userGrowthData.map((item) => item.totalUsers)

    // Set colors based on the current theme
    const isDark = theme === "dark"
    const gradientStart = isDark ? "rgba(168, 85, 247, 0.4)" : "rgba(168, 85, 247, 0.4)"
    const gradientEnd = isDark ? "rgba(168, 85, 247, 0)" : "rgba(168, 85, 247, 0)"
    const lineColor = isDark ? "rgba(168, 85, 247, 1)" : "rgba(168, 85, 247, 1)"

    setChartData({
      labels,
      datasets: [
        {
          label: "Total Users",
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
  }, [userGrowthData, theme])

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
        callbacks: {
          label: (context: any) => {
            const dataIndex = context.dataIndex
            const newUsers = userGrowthData[dataIndex]?.newUsers || 0
            return [`Total Users: ${context.raw.toLocaleString()}`, `New Users: ${newUsers.toLocaleString()}`]
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
          callback: (value: number) => value.toLocaleString(),
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
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>Total user growth over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Growth</CardTitle>
        <CardDescription>Total user growth over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{error}</div>
          ) : chartData ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No user growth data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
