"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowDownLeft, Building2, Receipt } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required").max(20, "Card number cannot exceed 20 characters"),
  partnerFloat: z.string().min(1, "Partner float account is required"),
  customerName: z.string().min(3, "Customer name must be at least 3 characters"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 characters"),
  withdrawalAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  fee: z.coerce.number().min(0, "Fee must be 0 or greater").optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface WithdrawalFormProps {
  onSuccess?: (data: any) => void
  onCancel?: () => void
}

export function WithdrawalFormFixed({ onSuccess, onCancel }: WithdrawalFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ezwichPartnerAccounts, setEzwichPartnerAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardNumber: "",
      partnerFloat: "",
      customerName: "",
      customerPhone: "",
      withdrawalAmount: 0,
      fee: 2.0, // Default E-Zwich fee
      note: "",
    },
  })

  // Load E-Zwich partner accounts
  const loadEzwichPartnerAccounts = async () => {
    if (!user?.branchId) return

    setLoadingAccounts(true)
    try {
      const response = await fetch(`/api/float-accounts?branchId=${user.branchId}`)
      if (response.ok) {
        const data = await response.json()
        // Filter for E-Zwich partner accounts
        const ezwichPartners =
          data.data?.filter((acc: any) => acc.account_type === "agency-banking" && acc.isEzwichPartner === true) || []
        setEzwichPartnerAccounts(ezwichPartners)
      }
    } catch (error) {
      console.error("Error loading E-Zwich partner accounts:", error)
      setEzwichPartnerAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }

  useEffect(() => {
    loadEzwichPartnerAccounts()
  }, [user?.branchId])

  const generateReceipt = (transactionData: any) => {
    setReceiptData({
      ...transactionData,
      branchName: user?.branchName || "Main Branch",
      timestamp: new Date().toLocaleString(),
    })
    setShowReceipt(true)
  }

  const printReceipt = () => {
    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (!printWindow) return

    const receiptContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>E-Zwich Withdrawal Receipt</title>
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
          <p>${receiptData?.timestamp}</p>
        </div>
        <div class="line"></div>
        <h4 style="text-align: center;">E-ZWICH WITHDRAWAL RECEIPT</h4>
        <div class="line"></div>
        <div class="row"><span>Card Number:</span><span>${receiptData?.cardNumber}</span></div>
        <div class="row"><span>Customer:</span><span>${receiptData?.customerName}</span></div>
        <div class="row"><span>Phone:</span><span>${receiptData?.customerPhone}</span></div>
        <div class="row"><span>Amount:</span><span>GHS ${receiptData?.withdrawalAmount?.toFixed(2)}</span></div>
        <div class="row"><span>Fee:</span><span>GHS ${receiptData?.fee?.toFixed(2)}</span></div>
        <div class="row"><span>Total:</span><span>GHS ${(receiptData?.withdrawalAmount + receiptData?.fee)?.toFixed(2)}</span></div>
        <div class="row"><span>Reference:</span><span>${receiptData?.reference}</span></div>
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

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to process withdrawals",
        variant: "destructive",
      })
      return
    }

    console.log("🔄 [E-ZWICH] Submitting withdrawal:", values)

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/e-zwich/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "withdrawal",
          cardNumber: values.cardNumber,
          customerName: values.customerName,
          phoneNumber: values.customerPhone,
          amount: values.withdrawalAmount,
          fee: values.fee || 2.0,
          floatAccountId: values.partnerFloat,
          reference: `EZW-${Date.now()}`,
          userId: user.id,
          branchId: user.branchId,
          processedBy: user.name || user.email || "Unknown User",
        }),
      })

      console.log("Response status:", response.status)
      const result = await response.json()
      console.log("API Response:", result)

      if (result.success) {
        toast({
          title: "Withdrawal Processed",
          description: `GHS ${values.withdrawalAmount} withdrawal processed successfully`,
        })

        // Generate receipt
        generateReceipt({
          cardNumber: values.cardNumber,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          withdrawalAmount: values.withdrawalAmount,
          fee: values.fee || 2.0,
          reference: result.transaction?.reference || `EZW-${Date.now()}`,
        })

        form.reset()
        if (onSuccess) {
          onSuccess(result.transaction)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process withdrawal",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error processing withdrawal:", error)
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5" />
            E-Zwich Withdrawal
          </CardTitle>
          <CardDescription>Process a cash withdrawal from E-Zwich card</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Card Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Zwich Card Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter card number" {...field} maxLength={20} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partnerFloat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner Float Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingAccounts}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={loadingAccounts ? "Loading accounts..." : "Select E-Zwich partner account"}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ezwichPartnerAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>
                                  {account.provider} - {account.account_number}
                                  (Balance: GHS {Number(account.current_balance).toFixed(2)})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer's full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +233 24 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Transaction Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="withdrawalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Withdrawal Amount (GHS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
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
                      <FormLabel>Fee (GHS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="2.00"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any additional notes" className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Withdrawal...
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="mr-2 h-4 w-4" />
                      Process Withdrawal
                    </>
                  )}
                </Button>
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>E-Zwich Withdrawal Receipt</DialogTitle>
            <DialogDescription>Transaction completed successfully</DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              {/* Standard Header */}
              <div className="text-center border-b pb-4">
                <h3 className="font-bold text-lg">MIMHAAD FINANCIAL SERVICES</h3>
                <p className="text-sm">{receiptData.branchName}</p>
                <p className="text-sm">Tel: 0241378880</p>
                <p className="text-sm">Email: info@mimhaadfinancial.com</p>
                <p className="text-xs text-muted-foreground">{receiptData.timestamp}</p>
              </div>

              {/* Receipt Title */}
              <div className="text-center">
                <h4 className="font-semibold">E-ZWICH WITHDRAWAL RECEIPT</h4>
              </div>

              {/* Transaction Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Card Number:</span>
                  <span className="font-medium">{receiptData.cardNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium">{receiptData.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-medium">{receiptData.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">GHS {receiptData.withdrawalAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee:</span>
                  <span className="font-medium">GHS {receiptData.fee?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold">GHS {(receiptData.withdrawalAmount + receiptData.fee)?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <span className="font-medium">{receiptData.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-green-600">COMPLETED</span>
                </div>
              </div>

              {/* Standard Footer */}
              <div className="text-center border-t pt-4 text-sm space-y-1">
                <p className="font-medium">Thank you for using our service!</p>
                <p className="text-xs text-muted-foreground">
                  For inquiries, please call our customer service at 0241378880
                </p>
                <p className="text-xs text-muted-foreground">Visit us at: www.mimhaadfinancial.com</p>
                <p className="text-xs text-muted-foreground">Powered by MIMHAAD Financial Services</p>
              </div>

              <Button onClick={printReceipt} className="w-full">
                <Receipt className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
