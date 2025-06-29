"use client"

import type React from "react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useBranches } from "@/hooks/use-branches"
import { useCurrentUser } from "@/hooks/use-current-user-enhanced"

const formSchema = z.object({
  branchId: z.string().min(1, {
    message: "Branch is required.",
  }),
  accountType: z.string().min(1, {
    message: "Account type is required.",
  }),
  provider: z.string().optional(),
  accountNumber: z.string().min(1, {
    message: "Account number is required.",
  }),
  currentBalance: z.number(),
  minThreshold: z.number(),
  maxThreshold: z.number(),
})

interface CreateAccountFormProps {
  onSuccess?: () => void
}

const CreateAccountForm: React.FC<CreateAccountFormProps> = ({ onSuccess }) => {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { branches } = useBranches()
  const { user: currentUser } = useCurrentUser()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: "",
      accountType: "",
      provider: "",
      accountNumber: "",
      currentBalance: 0,
      minThreshold: 0,
      maxThreshold: 0,
    },
  })

  const [formData, setFormData] = useState({
    branchId: "",
    accountType: "",
    provider: "",
    accountNumber: "",
    currentBalance: 0,
    minThreshold: 0,
    maxThreshold: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/float-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          createdBy: currentUser?.id || "system",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create float account")
      }

      // Log audit with proper user information
      if (currentUser?.username) {
        try {
          await fetch("/api/audit/log", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: currentUser.id,
              username: currentUser.username,
              actionType: "create",
              entityType: "float_account",
              entityId: data.account?.id,
              description: `Created float account for ${formData.accountType}${formData.provider ? ` (${formData.provider})` : ""}`,
              details: {
                accountType: formData.accountType,
                provider: formData.provider,
                accountNumber: formData.accountNumber,
                initialBalance: formData.currentBalance,
              },
              branchId: formData.branchId,
              branchName: currentUser.branchName,
              severity: "medium",
            }),
          })
        } catch (auditError) {
          console.warn("Failed to log audit:", auditError)
          // Don't fail the main operation if audit fails
        }
      }

      toast({
        title: "Success",
        description: "Float account created successfully",
      })

      // Reset form
      setFormData({
        branchId: "",
        accountType: "",
        provider: "",
        accountNumber: "",
        currentBalance: 0,
        minThreshold: 0,
        maxThreshold: 0,
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error creating float account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create float account",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  setFormData({ ...formData, branchId: value })
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
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  setFormData({ ...formData, accountType: value })
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {formData.accountType === "bank" && (
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    setFormData({ ...formData, provider: value })
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ecobank">Ecobank</SelectItem>
                    <SelectItem value="calbank">Cal Bank</SelectItem>
                    <SelectItem value="accessbank">Access Bank</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {formData.accountType === "mobile_money" && (
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Money Provider</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    setFormData({ ...formData, provider: value })
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="mtn">MTN</SelectItem>
                    <SelectItem value="vodafone">Vodafone</SelectItem>
                    <SelectItem value="airteltigo">AirtelTigo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="Account Number"
                  type="text"
                  {...field}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Balance</FormLabel>
              <FormControl>
                <Input
                  placeholder="Current Balance"
                  type="number"
                  {...field}
                  onChange={(e) => setFormData({ ...formData, currentBalance: Number.parseFloat(e.target.value) })}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="minThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Threshold</FormLabel>
              <FormControl>
                <Input
                  placeholder="Minimum Threshold"
                  type="number"
                  {...field}
                  onChange={(e) => setFormData({ ...formData, minThreshold: Number.parseFloat(e.target.value) })}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Threshold</FormLabel>
              <FormControl>
                <Input
                  placeholder="Maximum Threshold"
                  type="number"
                  {...field}
                  onChange={(e) => setFormData({ ...formData, maxThreshold: Number.parseFloat(e.target.value) })}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Account"}
        </Button>
      </form>
    </Form>
  )
}

export { CreateAccountForm }
export default CreateAccountForm
