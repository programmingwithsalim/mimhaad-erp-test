export interface FloatAllocation {
  branchId: string
  branchName: string
  branchCode: string
  currentFloat: number
  maxAllocation: number
  lastAllocation: number
  lastAllocationDate: string
}

export interface FloatRequest {
  id: string
  branchId: string
  branchName: string
  branchCode: string
  amount: number
  reason: string
  urgency: "low" | "medium" | "high"
  status: "pending" | "approved" | "rejected"
  requestDate: string
  approvedAmount?: number
  approvalDate?: string
  notes?: string
  rejectionReason?: string
}

export interface HistoricalFloatData {
  branchId: string
  history: { date: string; value: number }[]
}
