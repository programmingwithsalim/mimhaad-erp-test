export interface AuditTrailEntry {
  userId: string
  action: string
  actionType: string
  timestamp: string
  transactionId?: string
  details?: string
  ipAddress: string
}
