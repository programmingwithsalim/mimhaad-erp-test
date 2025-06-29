"use client"

import { useState } from "react"
import { Bar, Pie, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  type ChartOptions,
} from "chart.js"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers, PieChart, BarChartIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

interface FloatAccount {
  id: string
  branchId?: string
  branchName?: string
  account_type: string
  provider?: string
  current_balance: number
  max_threshold?: number
  min_threshold?: number
  last_updated?: string
}

interface FloatLevelChartProps {
  accounts?: FloatAccount[]
}

type ChartGroupBy = "branch" | "service" | "provider" | "status"
type ChartType = "bar" | "pie" | "doughnut"

export function FloatLevelChart({ accounts = [] }: FloatLevelChartProps) {
  const [groupBy, setGroupBy] = useState<ChartGroupBy>("service")
  const [chartType, setChartType] = useState<ChartType>("bar")

  // Ensure we have valid accounts array
  const floatAccounts = Array.isArray(accounts) ? accounts : []

  // Group accounts based on selected grouping
  const groupedData = floatAccounts.reduce<Record<string, number>>((acc, account) => {
    if (!account || typeof account.current_balance !== "number") {
      return acc
    }

    let groupKey: string

    switch (groupBy) {
      case "branch":
        groupKey = account.branchName || "Unknown Branch"
        break
      case "provider":
        groupKey = account.provider ? `${account.provider}` : "Other"
        break
      case "status":
        const minThreshold = account.min_threshold || 0
        const maxThreshold = account.max_threshold || 10000
        if (account.current_balance < minThreshold) {
          groupKey = "Low Balance"
        } else if (account.current_balance > maxThreshold) {
          groupKey = "Excess Balance"
        } else {
          groupKey = "Healthy"
        }
        break
      case "service":
      default:
        groupKey = getServiceLabel(account.account_type)
        break
    }

    if (!acc[groupKey]) {
      acc[groupKey] = 0
    }

    acc[groupKey] += account.current_balance
    return acc
  }, {})

  // Sort data by value in descending order
  const sortedEntries = Object.entries(groupedData).sort((a, b) => b[1] - a[1])

  const labels = sortedEntries.map(([key]) => key)
  const data = sortedEntries.map(([_, value]) => value)

  // Generate colors based on status if grouping by status
  const getBackgroundColors = () => {
    if (groupBy === "status") {
      return labels.map((label) => {
        if (label === "Low Balance") return "rgba(239, 68, 68, 0.7)" // red
        if (label === "Excess Balance") return "rgba(59, 130, 246, 0.7)" // blue
        return "rgba(34, 197, 94, 0.7)" // green
      })
    }

    // Default color palette for other groupings
    return [
      "rgba(37, 99, 235, 0.7)",
      "rgba(59, 130, 246, 0.7)",
      "rgba(96, 165, 250, 0.7)",
      "rgba(147, 197, 253, 0.7)",
      "rgba(191, 219, 254, 0.7)",
      "rgba(34, 197, 94, 0.7)",
      "rgba(74, 222, 128, 0.7)",
      "rgba(239, 68, 68, 0.7)",
      "rgba(249, 115, 22, 0.7)",
      "rgba(234, 179, 8, 0.7)",
    ]
  }

  const barChartData = {
    labels,
    datasets: [
      {
        label: "Current Float",
        data,
        backgroundColor: getBackgroundColors(),
        borderColor: getBackgroundColors().map((color) => color.replace("0.7", "1")),
        borderWidth: 1,
      },
    ],
  }

  const pieChartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: getBackgroundColors(),
        borderColor: getBackgroundColors().map((color) => color.replace("0.7", "1")),
        borderWidth: 1,
      },
    ],
  }

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        display: chartType !== "bar",
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number
            return `GHS ${value.toLocaleString("en-GH")}`
          },
        },
      },
    },
    scales:
      chartType === "bar"
        ? {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `GHS ${Number(value).toLocaleString("en-GH")}`,
              },
            },
          }
        : undefined,
  }

  function getServiceLabel(serviceType: string): string {
    if (!serviceType) return "Unknown"

    switch (serviceType.toLowerCase()) {
      case "momo":
        return "Mobile Money"
      case "agency":
      case "agency-banking":
        return "Agency Banking"
      case "ezwich":
      case "e-zwich":
        return "E-Zwich"
      case "cash-in-till":
        return "Cash in Till"
      case "jumia":
        return "Jumia"
      case "power":
        return "Power"
      case "gmoney":
        return "G-Money"
      case "zpay":
        return "ZPay"
      default:
        return serviceType
    }
  }

  // Show empty state if no data
  if (floatAccounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Float Level Distribution</h3>
        </div>
        <div className="h-[350px] w-full flex items-center justify-center border rounded-lg">
          <div className="text-center text-muted-foreground">
            <p>No float account data available</p>
            <p className="text-sm">Create some float accounts to see the distribution chart</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Float Level Distribution</h3>
        <div className="flex items-center gap-2">
          <Tabs defaultValue={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <TabsList>
              <TabsTrigger value="bar" className="flex items-center gap-1">
                <BarChartIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bar</span>
              </TabsTrigger>
              <TabsTrigger value="pie" className="flex items-center gap-1">
                <PieChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pie</span>
              </TabsTrigger>
              <TabsTrigger value="doughnut" className="flex items-center gap-1">
                <PieChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Doughnut</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Layers className="h-3.5 w-3.5" />
                Group by:{" "}
                {groupBy === "service"
                  ? "Service Type"
                  : groupBy === "branch"
                    ? "Branch"
                    : groupBy === "provider"
                      ? "Provider"
                      : "Status"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Group Chart By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setGroupBy("service")}>
                  Service Type
                  {groupBy === "service" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("branch")}>
                  Branch
                  {groupBy === "branch" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("provider")}>
                  Provider
                  {groupBy === "provider" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupBy("status")}>
                  Status
                  {groupBy === "status" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="h-[350px] w-full">
        {chartType === "bar" && <Bar data={barChartData} options={options} />}
        {chartType === "pie" && <Pie data={pieChartData} options={options} />}
        {chartType === "doughnut" && <Doughnut data={pieChartData} options={options} />}
      </div>

      <div className="mt-2 text-center text-sm text-muted-foreground">
        {floatAccounts.length === 0
          ? "No data available to display"
          : `Showing float distribution for ${floatAccounts.length} accounts grouped by ${
              groupBy === "service"
                ? "service type"
                : groupBy === "branch"
                  ? "branch"
                  : groupBy === "provider"
                    ? "provider"
                    : "status"
            }`}
      </div>
    </div>
  )
}
