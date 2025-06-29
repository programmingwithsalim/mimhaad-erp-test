"use client"

import type React from "react"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function EZwichInventorySettings() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Threshold settings
  const [minThreshold, setMinThreshold] = useState<string>("50")
  const [reorderPoint, setReorderPoint] = useState<string>("75")
  const [maxStock, setMaxStock] = useState<string>("500")

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true)
  const [smsNotifications, setSmsNotifications] = useState<boolean>(false)
  const [dashboardAlerts, setDashboardAlerts] = useState<boolean>(true)
  const [notificationEmail, setNotificationEmail] = useState<string>("admin@example.com")
  const [notificationPhone, setNotificationPhone] = useState<string>("+233 20 123 4567")

  // Reorder settings
  const [autoReorder, setAutoReorder] = useState<boolean>(false)
  const [defaultOrderQuantity, setDefaultOrderQuantity] = useState<string>("200")
  const [preferredSupplier, setPreferredSupplier] = useState<string>(
    "Ghana Interbank Payment and Settlement Systems (GhIPSS)",
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (Number.parseInt(minThreshold) >= Number.parseInt(reorderPoint)) {
      toast({
        title: "Invalid thresholds",
        description: "Minimum threshold must be less than reorder point.",
        variant: "destructive",
      })
      return
    }

    if (Number.parseInt(reorderPoint) >= Number.parseInt(maxStock)) {
      toast({
        title: "Invalid thresholds",
        description: "Reorder point must be less than maximum stock level.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    toast({
      title: "Settings saved",
      description: "Your inventory settings have been updated successfully.",
    })

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Threshold Settings</h3>
        <p className="text-sm text-muted-foreground">Configure when to receive alerts about inventory levels</p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="minThreshold">Minimum Threshold</Label>
            <Input
              id="minThreshold"
              type="number"
              value={minThreshold}
              onChange={(e) => setMinThreshold(e.target.value)}
              min="1"
              required
            />
            <p className="text-xs text-muted-foreground">Critical level that requires immediate action</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorderPoint">Reorder Point</Label>
            <Input
              id="reorderPoint"
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              min="1"
              required
            />
            <p className="text-xs text-muted-foreground">Level at which you should place a new order</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxStock">Maximum Stock</Label>
            <Input
              id="maxStock"
              type="number"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              min="1"
              required
            />
            <p className="text-xs text-muted-foreground">Maximum inventory level to maintain</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-muted-foreground">Configure how you want to be notified about inventory events</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email alerts for inventory events</p>
            </div>
            <Switch id="emailNotifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>

          {emailNotifications && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                required={emailNotifications}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive SMS alerts for critical inventory events</p>
            </div>
            <Switch id="smsNotifications" checked={smsNotifications} onCheckedChange={setSmsNotifications} />
          </div>

          {smsNotifications && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="notificationPhone">Notification Phone</Label>
              <Input
                id="notificationPhone"
                type="tel"
                value={notificationPhone}
                onChange={(e) => setNotificationPhone(e.target.value)}
                required={smsNotifications}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dashboardAlerts">Dashboard Alerts</Label>
              <p className="text-sm text-muted-foreground">Show alerts on the dashboard for inventory events</p>
            </div>
            <Switch id="dashboardAlerts" checked={dashboardAlerts} onCheckedChange={setDashboardAlerts} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Reorder Settings</h3>
        <p className="text-sm text-muted-foreground">Configure automatic reordering and default order settings</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoReorder">Automatic Reordering</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate purchase orders when inventory reaches reorder point
              </p>
            </div>
            <Switch id="autoReorder" checked={autoReorder} onCheckedChange={setAutoReorder} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultOrderQuantity">Default Order Quantity</Label>
              <Input
                id="defaultOrderQuantity"
                type="number"
                value={defaultOrderQuantity}
                onChange={(e) => setDefaultOrderQuantity(e.target.value)}
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredSupplier">Preferred Supplier</Label>
              <Select value={preferredSupplier} onValueChange={setPreferredSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ghana Interbank Payment and Settlement Systems (GhIPSS)">
                    Ghana Interbank Payment and Settlement Systems (GhIPSS)
                  </SelectItem>
                  <SelectItem value="E-Zwich Authorized Distributor">E-Zwich Authorized Distributor</SelectItem>
                  <SelectItem value="Bank of Ghana">Bank of Ghana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button">
          Reset to Defaults
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  )
}
