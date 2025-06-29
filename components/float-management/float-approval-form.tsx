"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { FloatRequest } from "./types"
import { useToast } from "@/hooks/use-toast"

const formSchema = z
  .object({
    decision: z.enum(["approve", "reject"], {
      required_error: "Please select a decision.",
    }),
    approvedAmount: z.coerce.number().optional(),
    rejectionReason: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // If approving, must have an amount
      if (data.decision === "approve") {
        return data.approvedAmount !== undefined && data.approvedAmount > 0
      }
      return true
    },
    {
      message: "Approved amount is required and must be greater than 0",
      path: ["approvedAmount"],
    },
  )
  .refine(
    (data) => {
      // If rejecting, must have a reason
      if (data.decision === "reject") {
        return data.rejectionReason !== undefined && data.rejectionReason.length > 0
      }
      return true
    },
    {
      message: "Rejection reason is required",
      path: ["rejectionReason"],
    },
  )

interface FloatApprovalFormProps {
  request: FloatRequest
  onSubmit: (data: z.infer<typeof formSchema>) => void
  onCancel: () => void
}

export function FloatApprovalForm({ request, onSubmit, onCancel }: FloatApprovalFormProps) {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      decision: "approve",
      approvedAmount: request.amount,
      rejectionReason: "",
      notes: "",
    },
  })

  function handleSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: values.decision === "approve" ? "Request Approved" : "Request Rejected",
      description:
        values.decision === "approve"
          ? `You've approved a float request for ${values.approvedAmount?.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}`
          : `You've rejected a float request from ${request.branchName}`,
    })

    onSubmit(values)
  }

  const decision = form.watch("decision")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="rounded-md border p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-sm font-medium text-muted-foreground">Branch:</div>
            <div className="text-sm">{request.branchName}</div>

            <div className="text-sm font-medium text-muted-foreground">Requested Amount:</div>
            <div className="text-sm font-medium">
              {request.amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
            </div>

            <div className="text-sm font-medium text-muted-foreground">Urgency:</div>
            <div className="text-sm">{request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}</div>

            <div className="text-sm font-medium text-muted-foreground">Reason:</div>
            <div className="text-sm line-clamp-2">{request.reason}</div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="decision"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Decision</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="approve" />
                    </FormControl>
                    <FormLabel className="font-normal">Approve Request</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="reject" />
                    </FormControl>
                    <FormLabel className="font-normal">Reject Request</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {decision === "approve" && (
          <FormField
            control={form.control}
            name="approvedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Approved Amount (GHS)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormDescription>You can adjust the approved amount if needed</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {decision === "reject" && (
          <FormField
            control={form.control}
            name="rejectionReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rejection Reason</FormLabel>
                <FormControl>
                  <Textarea placeholder="Explain why the request is being rejected..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes or instructions..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{decision === "approve" ? "Approve Request" : "Reject Request"}</Button>
        </div>
      </form>
    </Form>
  )
}
