"use client"

import { useState, useEffect } from "react"
import { Radar } from "react-chartjs-2"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface ServicePerformanceChartProps {
  className?: string
}

type TimeRange = "month" | "quarter" | "year"

interface ServiceMetrics {
  service: string
  transactionVolume: number // 0-100 scale
  revenue: number // 0-100 scale
  customerSatisfaction: number // 0-100 scale
  growth: number // 0-100 scale
  profitMargin: number // 0-100 scale
}

export function ServicePerformanceChart({ className }: ServicePerformanceChartProps) {
  const [serviceData, setServiceData] = useState<ServiceMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("month")

  useEffect(() => {
    fetchServicePerformance()
  }, [timeRange])

  const fetchServicePerformance = async () => {
    setLoading(true)
    setError(null)

    try {
      // In a real implementation, we would fetch from an API with the timeRange parameter
      // For now, we'll generate mock data
      const mockData = generateMockServiceData()
      setServiceData(mockData)
    } catch (err) {
      console.error("Error fetching service performance data:", err)
      setError(err instanceof Error ? err.message : "Failed to load service performance data")
    } finally {
      setLoading(false)
    }
  }

  // Generate mock data for demonstration
  const generateMockServiceData = (): ServiceMetrics[] => {
    const services = ["Mobile Money", "Agency Banking", "E-Zwich", "Power", "Jumia"]

    return services.map((service) => {
      // Generate realistic but random performance metrics
      return {
        service,
        transactionVolume: Math.round(50 + Math.random() * 50), // 50-100
        revenue: Math.round(40 + Math.random() * 60), // 40-100
        customerSatisfaction: Math.round(60 + Math.random() * 40), // 60-100
        growth: Math.round(30 + Math.random() * 70), // 30-100
        profitMargin: Math.round(40 + Math.random() * 60), // 40-100
      }
    })
  }

  // Get time range label
  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case "month":
        return "This Month"
      case "quarter":
        return "This Quarter"
      case "year":
        return "This Year"
    }
  }

  // Prepare chart data
  const chartData = {
    labels: ["Transaction Volume", "Revenue", "Customer Satisfaction", "Growth", "Profit Margin"],
    datasets: serviceData.map((service, index) => ({
      label: service.service,
      data: [
        service.transactionVolume,
        service.revenue,
        service.customerSatisfaction,
        service.growth,
        service.profitMargin,
      ],
      backgroundColor: getBackgroundColor(index, 0.2),
      borderColor: getBorderColor(index),
      borderWidth: 2,
      pointBackgroundColor: getBorderColor(index),
      pointBorderColor: "#fff",
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: getBorderColor(index),
      pointRadius: 4,
    })),
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          showLabelBackdrop: false,
          font: {
            size: 10,
          },
        },
        pointLabels: {
          font: {
            size: 12,
          },
        },
        grid: {
          circular: true,
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.raw}/100`
          },
        },
      },
    },
  }

  // Helper function to get background color
  function getBackgroundColor(index: number, alpha = 0.8): string {
    const colors = [
      `rgba(34, 197, 94, ${alpha})`, // green-500
      `rgba(249, 115, 22, ${alpha})`, // orange-500
      `rgba(236, 72, 153, ${alpha})`, // pink-500
      `rgba(59, 130, 246, ${alpha})`, // blue-500
      `rgba(139, 92, 246, ${alpha})`, // violet-500
    ]

    return colors[index % colors.length]
  }

  // Helper function to get border color
  function getBorderColor(index: number): string {
    return getBackgroundColor(index, 1)
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Service Performance</CardTitle>
          <CardDescription>Comparing performance metrics across services</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading chart data</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchServicePerformance} className="mt-2">
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
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>
              {loading
                ? "Loading service performance data..."
                : `Comparing performance metrics across services for ${getTimeRangeLabel(timeRange).toLowerCase()}`}
            </CardDescription>
          </div>

          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs px-2">
                Month
              </TabsTrigger>
              <TabsTrigger value="quarter" className="text-xs px-2">
                Quarter
              </TabsTrigger>
              <TabsTrigger value="year" className="text-xs px-2">
                Year
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        ) : (
          <div className="h-[350px] relative">
            <Radar data={chartData} options={chartOptions} />
          </div>
        )}

        {!loading && serviceData.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Performance Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {serviceData.map((service) => (
                <div key={service.service} className="flex flex-col p-2 border rounded-md">
                  <span className="text-sm font-medium">{service.service}</span>
                  <span className="text-xs text-muted-foreground">
                    Avg. Score:{" "}
                    {Math.round(
                      (service.transactionVolume +
                        service.revenue +
                        service.customerSatisfaction +
                        service.growth +
                        service.profitMargin) /
                        5,
                    )}
                    /100
                  </span>
                  <span className="text-xs text-muted-foreground">Top: {getTopMetric(service)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to get the top metric for a service
function getTopMetric(service: ServiceMetrics): string {
  const metrics = [
    { name: "Transaction Volume", value: service.transactionVolume },
    { name: "Revenue", value: service.revenue },
    { name: "Customer Satisfaction", value: service.customerSatisfaction },
    { name: "Growth", value: service.growth },
    { name: "Profit Margin", value: service.profitMargin },
  ]

  const topMetric = metrics.reduce((max, metric) => (metric.value > max.value ? metric : max), metrics[0])

  return `${topMetric.name} (${topMetric.value})`
}
