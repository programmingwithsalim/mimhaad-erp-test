"use client"

import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Commission } from "@/lib/commission-types"

interface CommissionChartProps {
  data: Commission[]
}

export function CommissionChart({ data }: CommissionChartProps) {
  // Process data for chart
  const chartData = useMemo(() => {
    // Check if data is available and is an array
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("No commission data available for chart")
      return []
    }

    console.log("Processing commission chart data:", data.length, "items")

    // Group by source
    const groupedData: Record<string, { source: string; amount: number }> = {}

    data.forEach((commission) => {
      if (!commission) return

      const source = commission.source || "unknown"
      const sourceName = getSourceDisplayName(source)

      if (!groupedData[source]) {
        groupedData[source] = {
          source: sourceName,
          amount: 0,
        }
      }

      const amount = Number(commission.amount) || 0
      groupedData[source].amount += amount
    })

    const result = Object.values(groupedData)
    console.log("Chart data processed:", result)
    return result
  }, [data])

  // Helper function to get proper display names
  function getSourceDisplayName(source: string): string {
    const displayNames: Record<string, string> = {
      mtn: "MTN",
      vodafone: "Vodafone",
      "airtel-tigo": "AirtelTigo",
      jumia: "Jumia",
      vra: "VRA",
      "agency-banking": "Agency Banking",
      ecg: "ECG",
      nedco: "NEDCo",
      power: "Power Services",
    }

    return displayNames[source] || source.charAt(0).toUpperCase() + source.slice(1).replace("-", " ")
  }

  // Get colors for different sources
  const getBarColor = (source: string) => {
    const colors: Record<string, string> = {
      MTN: "#FFCC00",
      Vodafone: "#E60000",
      AirtelTigo: "#0033A0",
      Jumia: "#FF9900",
      VRA: "#6B2F93",
      "Agency Banking": "#3366CC",
      ECG: "#00AA44",
      NEDCo: "#FF6600",
      "Power Services": "#8B4513",
      unknown: "#999999",
    }

    return colors[source] || "#4f46e5"
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/20 rounded-md">
        <div className="text-center">
          <p className="text-muted-foreground">No commission data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Commission data will appear here once transactions are recorded
          </p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="source" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
        <YAxis tickFormatter={(value) => `₵${Number(value).toLocaleString()}`} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: any) => [
            `₵${Number(value).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            "Amount",
          ]}
          labelFormatter={(label) => `Provider: ${label}`}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <Legend />
        <Bar
          dataKey="amount"
          name="Commission Amount"
          fill="#4f46e5"
          radius={[4, 4, 0, 0]}
          barSize={40}
          stroke="#fff"
          strokeWidth={1}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
