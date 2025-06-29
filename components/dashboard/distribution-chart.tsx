"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"
import { Doughnut } from "react-chartjs-2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend)

interface DistributionData {
  type: string
  count: number
  amount: number
}

export function DistributionChart() {
  const { theme } = useTheme()
  const [chartData, setChartData] = useState<any>(null)
  const [distributionData, setDistributionData] = useState<DistributionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDistributionData()
  }, [])

  const fetchDistributionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/dashboard/transaction-data")
      const result = await response.json()

      if (result.success) {
        setDistributionData(result.data.transactionDistribution)
      } else {
        setError(result.error || "Failed to fetch distribution data")
        setDistributionData([])
      }
    } catch (err) {
      console.error("Error fetching distribution data:", err)
      setError("Failed to fetch distribution data")
      setDistributionData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (distributionData.length === 0) {
      setChartData(null)
      return
    }

    // Format transaction type names for display
    const formatTypeName = (type: string) => {
      return type
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }

    const labels = distributionData.map((item) => formatTypeName(item.type))
    const data = distributionData.map((item) => item.count)

    // Set colors based on the current theme
    const chartColors = [
      "rgba(56, 189, 248, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(34, 211, 238, 0.8)",
      "rgba(132, 204, 22, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(239, 68, 68, 0.8)",
    ]

    setChartData({
      labels,
      datasets: [
        {
          data,
          backgroundColor: chartColors.slice(0, labels.length),
          borderColor: theme === "dark" ? "rgba(30, 30, 30, 1)" : "rgba(255, 255, 255, 1)",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    })
  }, [distributionData, theme])

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        },
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
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const value = context.raw
            const percentage = ((value / total) * 100).toFixed(1)
            const dataIndex = context.dataIndex
            const amount = distributionData[dataIndex]?.amount || 0
            return [`${context.label}: ${percentage}% (${value})`, `Amount: GH₵${amount.toLocaleString()}`]
          },
        },
      },
    },
  }

  if (loading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Transaction Distribution</CardTitle>
          <CardDescription>Breakdown of transaction types</CardDescription>
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
        <CardTitle>Transaction Distribution</CardTitle>
        <CardDescription>Breakdown of transaction types</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          {error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{error}</div>
          ) : chartData ? (
            <Doughnut data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No distribution data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
