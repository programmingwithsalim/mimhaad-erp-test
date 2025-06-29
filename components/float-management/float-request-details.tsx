"use client"

import type { FloatRequest } from "./types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FloatRequestDetailsProps {
  request: FloatRequest
}

export function FloatRequestDetails({ request }: FloatRequestDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2 font-semibold">Request Information</h4>
          <Card>
            <CardContent className="pt-6">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Request ID:</dt>
                  <dd className="text-sm font-mono">{request.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Status:</dt>
                  <dd>
                    <Badge
                      variant={
                        request.status === "approved"
                          ? "default"
                          : request.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Request Date:</dt>
                  <dd className="text-sm">
                    {new Date(request.requestDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Request Time:</dt>
                  <dd className="text-sm">
                    {new Date(request.requestDate).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Urgency:</dt>
                  <dd>
                    <Badge
                      variant="outline"
                      className={
                        request.urgency === "high"
                          ? "bg-red-50 text-red-600"
                          : request.urgency === "medium"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-blue-50 text-blue-600"
                      }
                    >
                      {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div>
          <h4 className="mb-2 font-semibold">Branch Information</h4>
          <Card>
            <CardContent className="pt-6">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Branch Name:</dt>
                  <dd className="text-sm font-medium">{request.branchName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Branch Code:</dt>
                  <dd className="text-sm">{request.branchCode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Requested Amount:</dt>
                  <dd className="text-sm font-medium">
                    {request.amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
                  </dd>
                </div>

                {request.approvedAmount !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Approved Amount:</dt>
                    <dd className="text-sm font-medium">
                      {request.approvedAmount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
                    </dd>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-muted-foreground">Rejection Reason:</dt>
                    <dd className="text-sm">{request.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h4 className="mb-2 font-semibold">Request Details</h4>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm whitespace-pre-line">{request.reason}</p>
          </CardContent>
        </Card>
      </div>

      {request.notes && (
        <div>
          <h4 className="mb-2 font-semibold">Additional Notes</h4>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm whitespace-pre-line">{request.notes}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
