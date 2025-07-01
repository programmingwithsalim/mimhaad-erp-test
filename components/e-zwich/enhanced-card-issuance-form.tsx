"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CreditCard, RefreshCw, Upload, User, Hash } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface CardIssuanceFormProps {
  onSuccess?: (data: any) => void;
}

const bioSchema = z.object({
  customer_name: z.string().min(2, "Full name is required"),
  customer_phone: z.string().min(8, "Phone number is required"),
  customer_email: z.string().email().optional().or(z.literal("")),
  date_of_birth: z.string().refine(
    (val) => {
      if (!val) return false;
      const dob = new Date(val);
      const today = new Date();
      const age =
        today.getFullYear() -
        dob.getFullYear() -
        (today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
          ? 1
          : 0);
      return age >= 18;
    },
    { message: "Customer must be at least 18 years old" }
  ),
  gender: z.string().optional(),
  address: z.string().optional(),
});
const idSchema = z.object({
  id_type: z.string().min(2, "ID type is required"),
  id_number: z.string().min(2, "ID number is required"),
  id_expiry_date: z.string().optional(),
});
const cardSchema = z.object({
  card_type: z.string().min(2, "Card type is required"),
  initial_deposit: z.string().optional(),
});
const filesSchema = z.object({
  customer_photo: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, {
      message: "Customer photo is required",
    }),
  id_front_image: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, {
      message: "ID front image is required",
    }),
  id_back_image: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, {
      message: "ID back image is required",
    }),
});
const notesSchema = z.object({
  notes: z.string().optional(),
});
const fullSchema = bioSchema
  .merge(idSchema)
  .merge(cardSchema)
  .merge(filesSchema)
  .merge(notesSchema)
  .refine(
    (data) => {
      const { id_type, id_number } = data;
      if (id_type === "ghana_card") {
        return /^GHA-\d{9}-\d$/.test(id_number);
      }
      if (id_type === "voters_id" || id_type === "nhis") {
        return /^\d{10}$/.test(id_number);
      }
      if (id_type === "passport") {
        return /^[A-Za-z][A-Za-z0-9]{7,}$/.test(id_number);
      }
      if (id_type === "drivers_license") {
        return /^[A-Za-z0-9]{5,}$/.test(id_number);
      }
      return false;
    },
    {
      message: "ID format is invalid for selected type",
      path: ["id_number"],
    }
  );

const steps = ["Bio", "ID", "Card", "Review"];

export function EnhancedCardIssuanceForm({ onSuccess }: CardIssuanceFormProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const methods = useForm({
    resolver: zodResolver(fullSchema),
    mode: "onTouched",
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      date_of_birth: "",
      gender: "",
      address: "",
      id_type: "",
      id_number: "",
      id_expiry_date: "",
      card_type: "",
      initial_deposit: "",
      customer_photo: null,
      id_front_image: null,
      id_back_image: null,
      notes: "",
    },
  });

  const { handleSubmit, watch, setValue, trigger, formState } = methods;
  const values = watch();

  const nextStep = async () => {
    let valid = false;
    if (step === 0)
      valid = await trigger([
        "customer_name",
        "customer_phone",
        "customer_email",
        "date_of_birth",
        "gender",
        "address",
      ]);
    if (step === 1)
      valid = await trigger(["id_type", "id_number", "id_expiry_date"]);
    if (step === 2)
      valid = await trigger([
        "card_type",
        "initial_deposit",
        "customer_photo",
        "id_front_image",
        "id_back_image",
      ]);
    if (step === 3) valid = true;
    if (valid) setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: any) => {
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      const submitData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && typeof value === "string") {
          submitData.append(key, value);
        }
      });
      if (data.customer_photo)
        submitData.append("customer_photo", data.customer_photo);
      if (data.id_front_image)
        submitData.append("id_front_image", data.id_front_image);
      if (data.id_back_image)
        submitData.append("id_back_image", data.id_back_image);
      submitData.append("user_id", user.id);
      submitData.append("branch_id", user.branchId);
      submitData.append("processed_by", user.name || user.id);
      const response = await fetch("/api/e-zwich/card-issuance", {
        method: "POST",
        body: submitData,
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Card Issuance Successful",
          description: "E-Zwich card has been issued successfully",
        });
        if (onSuccess) {
          onSuccess({
            id: result.cardId || `card-${Date.now()}`,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            card_type: data.card_type,
            initial_deposit: data.initial_deposit,
            type: "card_issuance",
          });
        }
      } else {
        toast({
          title: "Card Issuance Failed",
          description: result.error || "Failed to issue card",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error issuing card:", error);
      toast({
        title: "Card Issuance Failed",
        description: "Failed to issue card",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          E-Zwich Card Issuance
        </CardTitle>
        <CardDescription>
          Issue a new E-Zwich card with complete customer information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-between mb-4">
              {steps.map((label, idx) => (
                <div
                  key={label}
                  className={`flex-1 text-center ${
                    step === idx
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
            {step === 0 && (
              <div className="space-y-4">
                {/* Bio fields */}
                <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                  <User className="h-5 w-5" />
                  Bio Information
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Full Name *</Label>
                    <Input
                      id="customer_name"
                      value={values.customer_name}
                      onChange={(e) =>
                        setValue("customer_name", e.target.value)
                      }
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone Number *</Label>
                    <Input
                      id="customer_phone"
                      value={values.customer_phone}
                      onChange={(e) =>
                        setValue("customer_phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email Address</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={values.customer_email}
                      onChange={(e) =>
                        setValue("customer_email", e.target.value)
                      }
                      placeholder="Enter email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={values.date_of_birth}
                      onChange={(e) =>
                        setValue("date_of_birth", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={values.gender}
                      onValueChange={(value) => setValue("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={values.address}
                      onChange={(e) => setValue("address", e.target.value)}
                      placeholder="Enter full address"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                {/* ID fields */}
                <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                  <Hash className="h-5 w-5" />
                  ID Information
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="id_type">ID Type *</Label>
                    <Select
                      value={values.id_type}
                      onValueChange={(value) => setValue("id_type", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ghana_card">Ghana Card</SelectItem>
                        <SelectItem value="voters_id">Voter's ID</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">
                          Driver's License
                        </SelectItem>
                        <SelectItem value="nhis">NHIS Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id_number">ID Number *</Label>
                    <Input
                      id="id_number"
                      value={values.id_number}
                      onChange={(e) => setValue("id_number", e.target.value)}
                      placeholder="Enter ID number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id_expiry_date">ID Expiry Date</Label>
                    <Input
                      id="id_expiry_date"
                      type="date"
                      value={values.id_expiry_date}
                      onChange={(e) =>
                        setValue("id_expiry_date", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                {/* Card details fields */}
                <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                  <CreditCard className="h-5 w-5" />
                  Card Details
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="card_type">Card Type *</Label>
                    <Select
                      value={values.card_type}
                      onValueChange={(value) => setValue("card_type", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select card type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Card</SelectItem>
                        <SelectItem value="premium">Premium Card</SelectItem>
                        <SelectItem value="student">Student Card</SelectItem>
                        <SelectItem value="senior">
                          Senior Citizen Card
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initial_deposit">
                      Initial Deposit (GHS)
                    </Label>
                    <Input
                      id="initial_deposit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={values.initial_deposit}
                      onChange={(e) =>
                        setValue("initial_deposit", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_photo">Customer Photo</Label>
                  <Input
                    id="customer_photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setValue("customer_photo", e.target.files?.[0] || null, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_front_image">ID Front Image</Label>
                  <Input
                    id="id_front_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setValue("id_front_image", e.target.files?.[0] || null, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_back_image">ID Back Image</Label>
                  <Input
                    id="id_back_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setValue("id_back_image", e.target.files?.[0] || null, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                {/* Review step: show summary of all fields */}
                {/* ...summary... */}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button type="button" onClick={prevStep} disabled={step === 0}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Issuing..." : "Submit"}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
