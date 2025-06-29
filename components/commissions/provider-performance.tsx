"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import type { Commission } from "@/lib/commission-types"

interface ProviderPerformanceProps {
  commissions: Commission[]
}

export function ProviderPerformance({ commissions }: ProviderPerformanceProps) {
  const providerData = useMemo(() => {
    if (!commissions || commissions.length === 0) {
      return []
    }

    // Group by provider
    const providers: Record<string, { name: string; amount: number; count: number }> = {}
    let totalAmount = 0

    commissions.forEach((commission) => {
      const source = commission.source
      const displayName = getProviderDisplayName(source)

      if (!providers[source]) {
        providers[source] = {
          name: displayName,
          amount: 0,
          count: 0,
        }
      }

      providers[source].amount += commission.amount
      providers[source].count += 1
      totalAmount += commission.amount
    })

    // Convert to array and calculate percentage
    return Object.values(providers)
      .map((provider) => ({
        ...provider,
        percentage: totalAmount > 0 ? (provider.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [commissions])

  function getProviderDisplayName(source: string): string {
    switch (source) {
      case "mtn":
        return "MTN"
      case "vodafone":
        return "Vodafone"
      case "airtel-tigo":
        return "AirtelTigo"
      case "jumia":
        return "Jumia"
      case "vra":
        return "VRA"
      case "agency-banking":
        return "Agency Banking"
      default:
        return source.charAt(0).toUpperCase() + source.slice(1)
    }
  }

  function getProviderColor(source: string): string {
    const colors: Record<string, string> = {
      mtn: "bg-yellow-500",
      vodafone: "bg-red-500",
      "airtel-tigo": "bg-blue-500",
      jumia: "bg-green-500",
      vra: "bg-purple-500",
      "agency-banking": "bg-indigo-500",
    }
    return colors[source] || "bg-gray-500"
  }

  if (providerData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Performance</CardTitle>
          <CardDescription>Commission breakdown by service provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Performance</CardTitle>
        <CardDescription>Commission breakdown by service provider</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {providerData.map((provider) => (
            <div key={provider.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getProviderColor(provider.name.toLowerCase())}`}></div>
                  <span className="font-medium">{provider.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(provider.amount)} ({provider.count})
                </div>
              </div>
              <Progress value={provider.percentage} className="h-2" />
              <div className="text-xs text-right text-muted-foreground">{provider.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
