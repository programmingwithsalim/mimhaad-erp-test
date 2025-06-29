"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { ExpenseHead } from "@/lib/expense-types"

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  category: z.string({
    required_error: "Please select a category.",
  }),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface ExpenseHeadFormProps {
  expenseHead: ExpenseHead | null
  onSubmit: (data: FormValues) => void
  onCancel: () => void
}

export function ExpenseHeadForm({ expenseHead, onSubmit, onCancel }: ExpenseHeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize the form with default values or existing expense head data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: expenseHead?.name || "",
      category: expenseHead?.category || "",
      description: expenseHead?.description || "",
      is_active: expenseHead?.is_active ?? true,
    },
  })

  // Update form values when expenseHead changes
  useEffect(() => {
    if (expenseHead) {
      form.reset({
        name: expenseHead.name,
        category: expenseHead.category,
        description: expenseHead.description,
        is_active: expenseHead.is_active,
      })
    } else {
      form.reset({
        name: "",
        category: "",
        description: "",
        is_active: true,
      })
    }
  }, [expenseHead, form])

  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter expense head name" {...field} />
              </FormControl>
              <FormDescription>The name of the expense head (e.g., Office Supplies, Utilities).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Group</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="capital">Capital</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>The group this expense head belongs to for reporting purposes.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter a description for this expense head" className="resize-none" {...field} />
              </FormControl>
              <FormDescription>Optional description to provide more details about this expense head.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription>Inactive heads won't appear in expense entry forms.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : expenseHead ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
