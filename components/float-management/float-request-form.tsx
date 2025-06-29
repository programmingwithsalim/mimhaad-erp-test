"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface FloatAllocation {
  branchId: string
  branchName: string
  branchCode: string
  currentFloat: number
  maxAllocation: number
  lastAllocation: number
  lastAllocationDate: string
}

interface FloatRequestFormProps {
  branches: FloatAllocation[]
  onSubmit: (data: any) => void
  onCancel: () => void
}

const formSchema = z.object({
  branchId: z.string({
    required_error: "Please select a branch",
  }),
  amount: z.coerce
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be positive"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  urgency: z.enum(["low", "medium", "high"], {
    required_error: "Please select urgency level",
  }),
})

export function FloatRequestForm({ branches, onSubmit, onCancel }: FloatRequestFormProps) {
  const [selectedBranch, setSelectedBranch] = useState<FloatAllocation | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
      urgency: "medium",
    },
  })

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find((b) => b.branchId === branchId)
    setSelectedBranch(branch || null)
  }

  function handleSubmit(values: z.infer<typeof formSchema>) {
    const branch = branches.find((b) => b.branchId === values.branchId)
    if (!branch) return

    onSubmit({
      ...values,
      branchName: branch.branchName,
      branchCode: branch.branchCode,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  handleBranchChange(value)
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.branchId} value={branch.branchId}>
                      {branch.branchName} ({branch.branchCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedBranch && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span>Current Float:</span>
              <span className="font-medium">
                {selectedBranch.currentFloat.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Max Allocation:</span>
              <span className="font-medium">
                {selectedBranch.maxAllocation.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
              </span>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (GHS)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormDescription>Enter the amount of float needed</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea placeholder="Explain why this float is needed..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="urgency"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Urgency</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="low" />
                    </FormControl>
                    <FormLabel className="font-normal">Low</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="medium" />
                    </FormControl>
                    <FormLabel className="font-normal">Medium</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="high" />
                    </FormControl>
                    <FormLabel className="font-normal">High</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Submit Request</Button>
        </div>
      </form>
    </Form>
  )
}
