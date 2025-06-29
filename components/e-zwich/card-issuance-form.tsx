"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CreditCard, Wallet, Building2, Banknote } from "lucide-react"

const formSchema = z.object({
  card_number: z
    .string()
    .length(10, "E-Zwich card number must be exactly 10 digits")
    .regex(/^\d{10}$/, "E-Zwich card number must contain only 10 digits"),
  customer_name: z.string().min(3, "Customer name must be at least 3 characters"),
  phone_number: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fee: z.coerce.number().min(0, "Fee cannot be negative"),
  payment_method: z.enum(["cash", "momo", "bank_transfer"], {
    required_error: "Please select a payment method",
  }),
  payment_account_id: z.string().optional(),
  id_type: z.string().optional(),
  id_number: z.string().optional(),
  gender: z.string().optional(),
  reference: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CardIssuanceFormProps {
  onSuccess?: (data: any) => void
}

export function CardIssuanceForm({ onSuccess }: CardIssuanceFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [floatAccounts, setFloatAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      card_number: "",
      customer_name: "",
      phone_number: "",
      email: "",
      fee: 15,
      payment_method: "cash",
      payment_account_id: "",
      id_type: "",
      id_number: "",
      gender: "",
      reference: "",
    },
  })

  const watchPaymentMethod = form.watch("payment_method")

  // Load E-Zwich partner accounts when payment method changes
  const loadEzwichPartnerAccounts = async () => {
    if (!user?.branchId) return

    setLoadingAccounts(true)
    try {
      const response = await fetch(`/api/float-accounts/ezwich-partners?branchId=${user.branchId}`)
      if (response.ok) {
        const data = await response.json()
        setFloatAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error loading E-Zwich partner accounts:", error)
      setFloatAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Load accounts when payment method changes to non-cash
  useEffect(() => {
    if (watchPaymentMethod !== "cash") {
      loadEzwichPartnerAccounts()
    } else {
      setFloatAccounts([])
    }
  }, [watchPaymentMethod, user?.branchId])

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to issue cards",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/e-zwich/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "card_issuance",
          ...values,
          user_id: user.id,
          branch_id: user.branchId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Card Issued Successfully",
          description: `E-Zwich card ${values.card_number} issued to ${values.customer_name}`,
        })
        form.reset()
        setReceiptData({ ...values, branchName: user.branch?.name })
        if (onSuccess) {
          onSuccess(result.transaction)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to issue card",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error issuing card:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "momo":
        return <Wallet className="h-4 w-4" />
      case "bank_transfer":
        return <Building2 className="h-4 w-4" />
      default:
        return <Banknote className="h-4 w-4" />
    }
  }

  const printReceipt = () => {
    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (!printWindow) return

    const isPackage = receiptData?.type === "package"
    const title = isPackage ? "PACKAGE RECEIPT" : "COLLECTION RECEIPT"

    const receiptContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>E-Zwich ${title}</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { width: 60px; height: 60px; margin: 0 auto 10px; }
          .line { border-bottom: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo.png" alt="MIMHAAD Logo" class="logo" />
          <h3>MIMHAAD FINANCIAL SERVICES</h3>
          <p>${receiptData?.branchName}</p>
          <p>Tel: 0241378880</p>
          <p>Email: info@mimhaadfinancial.com</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
        <div class="line"></div>
        <h4 style="text-align: center;">E-ZWICH CARD ISSUANCE RECEIPT</h4>
        <div class="line"></div>
        <div class="row"><span>Card Number:</span><span>${receiptData?.card_number}</span></div>
        <div class="row"><span>Customer:</span><span>${receiptData?.customer_name}</span></div>
        <div class="row"><span>Phone:</span><span>${receiptData?.phone_number}</span></div>
        <div class="row"><span>Fee:</span><span>GHS ${receiptData?.fee?.toFixed(2)}</span></div>
        <div class="row"><span>Payment Method:</span><span>${receiptData?.payment_method?.toUpperCase()}</span></div>
        <div class="row"><span>Status:</span><span>COMPLETED</span></div>
        <div class="line"></div>
        <div class="footer">
          <p>Thank you for using our service!</p>
          <p>For inquiries, please call our customer service at 0241378880</p>
          <p>Visit us at: www.mimhaadfinancial.com</p>
          <p>Powered by MIMHAAD Financial Services</p>
        </div>
      </body>
    </html>
  `

    printWindow.document.write(receiptContent)
    printWindow.document.close()
    printWindow.print()
    printWindow.close()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="h-6 w-6" />
          Issue E-Zwich Card
        </CardTitle>
        <CardDescription>
          Enter the 10-digit card number and customer details to issue a new E-Zwich card
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* CARD NUMBER FIELD - MOST PROMINENT */}
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <FormField
                control={form.control}
                name="card_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-bold text-blue-800 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      E-Zwich Card Number (Required)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 10-digit card number (e.g., 1234567890)"
                        {...field}
                        maxLength={10}
                        className="text-lg font-mono tracking-wider h-12 border-2 border-blue-300 focus:border-blue-500"
                        onChange={(e) => {
                          // Only allow digits and limit to 10 characters
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-blue-700">
                      Enter the E-Zwich card number (exactly 10 digits, numbers only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CUSTOMER DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Fee (GHS) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="15.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PAYMENT METHOD SECTION */}
            <div className="p-4 border rounded-lg bg-gray-50">
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Cash Payment
                          </div>
                        </SelectItem>
                        <SelectItem value="momo">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Mobile Money
                          </div>
                        </SelectItem>
                        <SelectItem value="bank_transfer">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Bank Transfer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* E-ZWICH PARTNER ACCOUNT SELECTION */}
              {watchPaymentMethod && watchPaymentMethod !== "cash" && (
                <FormField
                  control={form.control}
                  name="payment_account_id"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>E-Zwich Partner Account *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingAccounts}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingAccounts
                                  ? "Loading E-Zwich partner accounts..."
                                  : "Select E-Zwich partner account"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {floatAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(watchPaymentMethod)}
                                <span>
                                  {account.provider} - {account.account_number}
                                  (Balance: GHS {Number(account.current_balance).toFixed(2)})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only E-Zwich partner accounts are shown for card issuance transactions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ADDITIONAL DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ghana_card">Ghana Card</SelectItem>
                        <SelectItem value="voters_id">Voter's ID</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ID number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter reference number or notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Card Issuance...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Issue E-Zwich Card
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      {receiptData && (
        <div className="p-4">
          <Button variant="outline" onClick={printReceipt}>
            Print Receipt
          </Button>
        </div>
      )}
    </Card>
  )
}
