"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useBranches } from "@/hooks/use-branches"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useFloatThresholds } from "@/hooks/use-float-thresholds"

const formSchema = z
  .object({
    branchId: z.string().min(1, "Branch is required"),
    accountType: z.string().min(1, "Account type is required"),
    provider: z.string().optional(),
    customProvider: z.string().optional(),
    accountNumber: z.string().min(1, "Account number is required"),
    currentBalance: z.coerce.number().min(0, "Balance must be positive"),
    minThreshold: z.coerce.number().min(0, "Minimum threshold must be positive"),
    maxThreshold: z.coerce.number().min(0, "Maximum threshold must be positive"),
    isEzwichPartner: z.boolean().default(false),
  })
  .refine((data) => data.maxThreshold > data.minThreshold, {
    message: "Maximum threshold must be greater than minimum threshold",
    path: ["maxThreshold"],
  })

type FormData = z.infer<typeof formSchema>

interface EnhancedCreateAccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// Predefined providers for each account type
const PROVIDERS = {
  momo: [
    { value: "MTN", label: "MTN Mobile Money" },
    { value: "Vodafone", label: "Vodafone Cash" },
    { value: "AirtelTigo", label: "AirtelTigo Money" },
  ],
  "agency-banking": [
    { value: "Ecobank", label: "Ecobank" },
    { value: "GCB", label: "GCB Bank" },
    { value: "Absa", label: "Absa Bank" },
    { value: "Stanbic", label: "Stanbic Bank" },
    { value: "Cal Bank", label: "CAL Bank" },
    { value: "Access Bank", label: "Access Bank" },
    { value: "Zenith Bank", label: "Zenith Bank" },
    { value: "Fidelity Bank", label: "Fidelity Bank" },
    { value: "UBA", label: "UBA" },
  ],
  power: [
    { value: "ECG", label: "Electricity Company of Ghana" },
    { value: "VRA", label: "Volta River Authority" },
    { value: "NEDCo", label: "Northern Electricity Distribution Company" },
  ],
  "cash-in-till": [],
  "e-zwich": [],
  jumia: [],
}

const ACCOUNT_TYPES = [
  { value: "momo", label: "Mobile Money" },
  { value: "agency-banking", label: "Agency Banking" },
  { value: "power", label: "Power" },
  { value: "cash-in-till", label: "Cash in Till" },
  { value: "e-zwich", label: "E-Zwich" },
  { value: "jumia", label: "Jumia" },
]

export function EnhancedCreateAccountForm({ open, onOpenChange, onSuccess }: EnhancedCreateAccountFormProps) {
  const { toast } = useToast()
  const { branches } = useBranches()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCustomProvider, setShowCustomProvider] = useState(false)
  const [addProviderDialog, setAddProviderDialog] = useState(false)
  const [newProviderName, setNewProviderName] = useState("")

  const { getThresholdForAccountType } = useFloatThresholds()
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: "",
      accountType: "",
      provider: "",
      customProvider: "",
      accountNumber: "",
      currentBalance: 0,
      minThreshold: 1000,
      maxThreshold: 10000,
      isEzwichPartner: false,
    },
  })

  const selectedAccountType = form.watch("accountType")

  useEffect(() => {
    if (selectedAccountType) {
      const { min, max } = getThresholdForAccountType(selectedAccountType)
      form.setValue("minThreshold", min)
      form.setValue("maxThreshold", max)
    }
  }, [selectedAccountType, getThresholdForAccountType, form.setValue])

  const availableProviders = PROVIDERS[selectedAccountType as keyof typeof PROVIDERS] || []
  const needsProvider = availableProviders.length > 0

  const handleAddCustomProvider = () => {
    if (!newProviderName.trim()) return

    form.setValue("provider", "custom")
    form.setValue("customProvider", newProviderName.trim())
    setNewProviderName("")
    setAddProviderDialog(false)
    setShowCustomProvider(true)

    toast({
      title: "Custom Provider Added",
      description: `"${newProviderName}" will be used as the provider.`,
    })
  }

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true)

      // Use custom provider if specified
      const finalProvider = data.provider === "custom" ? data.customProvider : data.provider

      const payload = {
        branchId: data.branchId,
        accountType: data.accountType,
        provider: finalProvider || null,
        accountNumber: data.accountNumber,
        currentBalance: data.currentBalance,
        minThreshold: data.minThreshold,
        maxThreshold: data.maxThreshold,
        isEzwichPartner: data.isEzwichPartner,
        createdBy: user?.id || "system",
      }

      console.log("Creating float account with payload:", payload)

      const response = await fetch("/api/float-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create float account")
      }

      toast({
        title: "Account Created",
        description: "Float account has been created successfully.",
      })

      form.reset()
      setShowCustomProvider(false)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error creating float account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Float Account</DialogTitle>
            <DialogDescription>
              Add a new float account to manage balances for a specific service and branch.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        form.setValue("provider", "")
                        setShowCustomProvider(false)
                        // Auto-set isEzwichPartner for agency-banking accounts
                        if (value === "agency-banking") {
                          form.setValue("isEzwichPartner", false)
                        } else if (value === "e-zwich") {
                          form.setValue("isEzwichPartner", false)
                        } else {
                          form.setValue("isEzwichPartner", false)
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsProvider && (
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            setShowCustomProvider(value === "custom")
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableProviders.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">+ Add Custom Provider</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setAddProviderDialog(true)}
                          title="Add new provider"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showCustomProvider && (
                <FormField
                  control={form.control}
                  name="customProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Provider Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter provider name" />
                      </FormControl>
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
                      <Input {...field} placeholder="Enter account number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* E-Zwich Partner Checkbox - only show for agency-banking accounts */}
              {selectedAccountType === "agency-banking" && (
                <FormField
                  control={form.control}
                  name="isEzwichPartner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>E-Zwich Partner Account</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check this if this is an E-Zwich partner settlement account
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="currentBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance (GHS)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
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
                      <FormLabel>Min Threshold (GHS)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
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
                      <FormLabel>Max Threshold (GHS)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Custom Provider Dialog */}
      <Dialog open={addProviderDialog} onOpenChange={setAddProviderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Custom Provider</DialogTitle>
            <DialogDescription>Enter the name of the new provider for {selectedAccountType}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Provider Name</label>
              <Input
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                placeholder="Enter provider name"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProviderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomProvider} disabled={!newProviderName.trim()}>
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
