"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFloatThresholds } from "@/hooks/use-float-thresholds"

interface Branch {
  id: string
  name: string
}

interface Account {
  id: string
  branch_id: string
  provider: string
  account_number: string
  min_threshold: string
  max_threshold: string
  account_type: string
}

interface EnhancedEditFloatAccountFormProps {
  account: Account
  branches: Branch[]
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>
}

const formSchema = z.object({
  branchId: z.string().min(2, {
    message: "Branch ID must be at least 2 characters.",
  }),
  provider: z.string().min(2, {
    message: "Provider must be at least 2 characters.",
  }),
  accountNumber: z.string().min(2, {
    message: "Account Number must be at least 2 characters.",
  }),
  minThreshold: z.string().min(1, {
    message: "Min Threshold must be at least 1 character.",
  }),
  maxThreshold: z.string().min(1, {
    message: "Max Threshold must be at least 1 character.",
  }),
})

export function EnhancedEditFloatAccountForm({
  account,
  branches,
  isOpen,
  setIsOpen,
  onSubmit,
}: EnhancedEditFloatAccountFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: account.branch_id || "",
      provider: account.provider || "",
      accountNumber: account.account_number || "",
      minThreshold: account.min_threshold || "",
      maxThreshold: account.max_threshold || "",
    },
  })

  const [minThreshold, setMinThreshold] = useState(account.min_threshold || "")
  const [maxThreshold, setMaxThreshold] = useState(account.max_threshold || "")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { getThresholdForAccountType } = useFloatThresholds()
  const [branchId, setBranchId] = useState(account.branch_id || "")
  const [provider, setProvider] = useState(account.provider || "")
  const [accountNumber, setAccountNumber] = useState(account.account_number || "")

  useEffect(() => {
    if (isOpen) {
      setBranchId(account.branch_id || "")
      setProvider(account.provider || "")
      setAccountNumber(account.account_number || "")
      setMinThreshold(account.min_threshold || "")
      setMaxThreshold(account.max_threshold || "")
    }
  }, [isOpen])

  useEffect(() => {
    if (account.account_type) {
      const { min, max } = getThresholdForAccountType(account.account_type)
      setMinThreshold(min.toString())
      setMaxThreshold(max.toString())
    }
  }, [account.account_type, getThresholdForAccountType])

  // Reset form when account changes
  useEffect(() => {
    setBranchId(account.branch_id || "")
    setProvider(account.provider || "")
    setAccountNumber(account.account_number || "")
    setMinThreshold(account.min_threshold || "")
    setMaxThreshold(account.max_threshold || "")
  }, [account])

  async function onSubmitHandler(values: z.infer<typeof formSchema>) {
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Float Account</DialogTitle>
          <DialogDescription>Make changes to your float account here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitHandler)} className="space-y-4">
            <FormField
              control={form.control}
              name="branchId"
              render={() => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={branchId}
                      onChange={(e) => {
                        setBranchId(e.target.value)
                        form.setValue("branchId", e.target.value)
                      }}
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Provider"
                      {...field}
                      value={provider}
                      onChange={(e) => {
                        setProvider(e.target.value)
                        form.setValue("provider", e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Account Number"
                      {...field}
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value)
                        form.setValue("accountNumber", e.target.value)
                      }}
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
                  <FormLabel>Min Threshold</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Min Threshold"
                      {...field}
                      value={minThreshold}
                      onChange={(e) => {
                        setMinThreshold(e.target.value)
                        form.setValue("minThreshold", e.target.value)
                      }}
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
                  <FormLabel>Max Threshold</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Max Threshold"
                      {...field}
                      value={maxThreshold}
                      onChange={(e) => {
                        setMaxThreshold(e.target.value)
                        form.setValue("maxThreshold", e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
