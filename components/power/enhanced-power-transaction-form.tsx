"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Calculator, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  TransactionReceipt,
  TransactionReceiptData,
} from "@/components/shared/transaction-receipt";

const formSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  meterNumber: z.string().min(5, "Meter number must be at least 5 characters"),
  customerName: z
    .string()
    .min(3, "Customer name must be at least 3 characters"),
  customerPhone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^\d{10}$/,
      "Phone number must be exactly 10 digits (e.g., 0241234567)"
    ),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  fee: z.coerce
    .number()
    .min(0, "Fee must be 0 or greater")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EnhancedPowerTransactionFormProps {
  powerFloats: any[];
  onSuccess?: (data: any) => void;
  user: any;
}

export function EnhancedPowerTransactionForm({
  powerFloats,
  onSuccess,
  user,
}: EnhancedPowerTransactionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPowerAccount, setSelectedPowerAccount] = useState<any>(null);
  const [feeConfig, setFeeConfig] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(
    null
  );
  const [showReceipt, setShowReceipt] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "",
      meterNumber: "",
      customerName: "",
      customerPhone: "",
      amount: 0,
      fee: undefined,
      description: "",
    },
  });

  const watchProvider = form.watch("provider");
  const watchAmount = form.watch("amount");

  // Update selected account when provider changes
  useEffect(() => {
    if (watchProvider) {
      const account = powerFloats.find((acc) => acc.id === watchProvider);
      setSelectedPowerAccount(account);
    } else {
      setSelectedPowerAccount(null);
    }
  }, [watchProvider, powerFloats]);

  // Load fee configuration and calculate fee
  const loadFeeConfig = async (amount: number, provider: string) => {
    try {
      const response = await fetch("/api/power/calculate-fee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          provider,
        }),
      });

      if (response.ok) {
        const config = await response.json();
        setFeeConfig(config);

        let calculatedFee = 0;
        if (config.fee_type === "fixed") {
          calculatedFee = Number(config.fee_value);
        } else if (config.fee_type === "percentage") {
          calculatedFee = (amount * Number(config.fee_value)) / 100;
          if (config.minimum_fee)
            calculatedFee = Math.max(calculatedFee, Number(config.minimum_fee));
          if (config.maximum_fee)
            calculatedFee = Math.min(calculatedFee, Number(config.maximum_fee));
        }

        form.setValue("fee", calculatedFee);
      } else {
        // Fallback fee calculation
        const fallbackFee = Math.min(amount * 0.02, 10); // 2% max 10 GHS
        form.setValue("fee", fallbackFee);
      }
    } catch (error) {
      console.error("Error loading fee config:", error);
      // Fallback fee calculation
      const fallbackFee = Math.min(amount * 0.02, 10); // 2% max 10 GHS
      form.setValue("fee", fallbackFee);
    }
  };

  // Auto-calculate fee when amount or provider changes
  useEffect(() => {
    if (watchAmount && watchAmount > 0 && watchProvider) {
      loadFeeConfig(watchAmount, watchProvider);
    } else {
      form.setValue("fee", 0);
      setFeeConfig(null);
    }
  }, [watchAmount, watchProvider, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to process power transactions",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPowerAccount) {
      toast({
        title: "Error",
        description: "Please select a power provider",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/power/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedPowerAccount.provider,
          meter_number: values.meterNumber,
          customer_name: values.customerName,
          customer_phone: values.customerPhone,
          amount: values.amount,
          fee:
            values.fee !== undefined && values.fee !== ""
              ? Number(values.fee)
              : 0,
          description:
            values.description ||
            `Power purchase for meter ${values.meterNumber}`,
          float_account_id: selectedPowerAccount.id,
          userId: user.id,
          branchId: user.branchId,
          processed_by: user.username || user.email || "Unknown User",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transaction Successful",
          description: `Power purchase of ${formatCurrency(
            values.amount
          )} processed successfully`,
        });

        // Set receipt data
        setReceiptData({
          transactionId: result.transaction.id,
          sourceModule: "power",
          transactionType: "sale",
          amount: values.amount,
          fee:
            values.fee !== undefined && values.fee !== ""
              ? Number(values.fee)
              : 0,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          reference: result.transaction.reference,
          branchName: user.branchName || "Main Branch",
          date: new Date().toISOString(),
          additionalData: {
            provider: selectedPowerAccount.provider,
            meterNumber: values.meterNumber,
          },
        });
        setShowReceipt(true);

        form.reset();
        if (onSuccess) {
          onSuccess(result.transaction);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process power transaction",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error processing power transaction:", error);
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Power Transaction
          </CardTitle>
          <CardDescription>
            Process electricity bill payments for customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Provider Selection */}
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Power Provider</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select power provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {powerFloats.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No power accounts available
                          </SelectItem>
                        ) : (
                          powerFloats.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{account.provider}</span>
                                <Badge variant="outline" className="ml-2">
                                  {formatCurrency(account.current_balance)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selected Account Info */}
              {selectedPowerAccount && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Selected Account Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">Provider:</span>
                      <span className="ml-2 font-medium">
                        {selectedPowerAccount.provider}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Balance:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(selectedPowerAccount.current_balance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Account Type:</span>
                      <span className="ml-2 font-medium capitalize">
                        {selectedPowerAccount.account_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Status:</span>
                      <Badge
                        variant={
                          selectedPowerAccount.is_active
                            ? "default"
                            : "secondary"
                        }
                        className="ml-2"
                      >
                        {selectedPowerAccount.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Meter Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="meterNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meter Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter meter number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Customer's electricity meter number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (GHS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>Power purchase amount</FormDescription>
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
                        <Input
                          placeholder="Enter customer's full name"
                          {...field}
                        />
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
                        <Input
                          placeholder="0241234567"
                          maxLength={10}
                          {...field}
                          onBlur={async () => {
                            await form.trigger("customerPhone");
                          }}
                          onChange={(e) => {
                            // Only allow digits
                            const value = e.target.value.replace(/\D/g, "");
                            // Limit to 10 digits
                            const limitedValue = value.slice(0, 10);
                            field.onChange(limitedValue);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fee Information */}
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Transaction Fee (GHS)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    {feeConfig && (
                      <FormDescription>
                        {feeConfig.fee_type === "fixed"
                          ? `Fixed fee: ${formatCurrency(feeConfig.fee_value)}`
                          : `${feeConfig.fee_value}% fee`}
                        {feeConfig.minimum_fee &&
                          ` (Min: ${formatCurrency(feeConfig.minimum_fee)})`}
                        {feeConfig.maximum_fee &&
                          ` (Max: ${formatCurrency(feeConfig.maximum_fee)})`}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter transaction description or notes"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional notes about this power transaction
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Transaction Summary */}
              {watchAmount > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Transaction Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-green-700">Power Amount:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(watchAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Transaction Fee:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(form.watch("fee") || 0)}
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-green-300">
                      <span className="text-green-700 font-medium">
                        Total Amount:
                      </span>
                      <span className="ml-2 font-bold text-lg">
                        {formatCurrency(watchAmount + (form.watch("fee") || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isSubmitting || !selectedPowerAccount}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing Transaction...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Process Power Transaction
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <TransactionReceipt
        data={receiptData}
        open={showReceipt}
        onOpenChange={setShowReceipt}
      />
    </div>
  );
}
