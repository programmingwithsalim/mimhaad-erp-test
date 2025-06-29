import { AuditTrailDashboard } from "@/components/audit-trail/audit-trail-dashboard"

export default function AuditTrailPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Audit Trail</h1>
      <p className="text-muted-foreground">
        View and search system audit logs and user activities for compliance and security monitoring.
      </p>
      <AuditTrailDashboard />
    </div>
  )
}
