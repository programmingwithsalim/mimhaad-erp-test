import type { Metadata } from "next"
import { FinancialReportsEnhanced } from "@/components/reports/financial-reports-enhanced"

export const metadata: Metadata = {
  title: "Financial Reports - Enhanced",
  description: "Comprehensive financial reporting with GL integration and real-time data.",
}

export default function FinancialReportsEnhancedPage() {
  return <FinancialReportsEnhanced />
}
