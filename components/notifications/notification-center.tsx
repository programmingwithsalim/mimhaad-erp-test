"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Send, Users, Shield, Settings, CheckCircle } from "lucide-react"
import { useAppServices } from "@/lib/services/app-integration-service"

export function NotificationCenter() {
  const [testMessage, setTestMessage] = useState("")
  const [bulkMessage, setBulkMessage] = useState("")
  const [securityMessage, setSecurityMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const { sendNotification, sendSecurityAlert, sendSystemUpdate, preferences, user } = useAppServices()

  const sendTestNotification = async (type: "transaction" | "system" | "security") => {
    setIsLoading(true)
    try {
      const messages = {
        transaction: "Test transaction notification - MoMo Cash Out of GHS 100.00 processed successfully",
        system: testMessage || "Test system notification - Float balance monitoring is active",
        security: "Test security alert - Unusual login activity detected",
      }

      await sendNotification({
        type,
        title: `Test ${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
        message: messages[type],
        email: user?.email,
        phone: user?.phone,
        userId: user?.id,
      })

      setResults((prev) => [...prev, `✅ ${type} notification sent successfully`])
    } catch (error) {
      setResults((prev) => [...prev, `❌ Failed to send ${type} notification: ${error}`])
    } finally {
      setIsLoading(false)
    }
  }

  const sendBulkSystemUpdate = async () => {
    if (!bulkMessage.trim()) return

    setIsLoading(true)
    try {
      await sendSystemUpdate(bulkMessage)
      setResults((prev) => [...prev, `✅ System update notification sent to all users`])
      setBulkMessage("")
    } catch (error) {
      setResults((prev) => [...prev, `❌ Failed to send bulk notification: ${error}`])
    } finally {
      setIsLoading(false)
    }
  }

  const sendSecurityBroadcast = async () => {
    if (!securityMessage.trim()) return

    setIsLoading(true)
    try {
      await sendSecurityAlert(securityMessage)
      setResults((prev) => [...prev, `✅ Security alert sent to all users`])
      setSecurityMessage("")
    } catch (error) {
      setResults((prev) => [...prev, `❌ Failed to send security alert: ${error}`])
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => setResults([])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Center
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test">Test Notifications</TabsTrigger>
          <TabsTrigger value="bulk">System Updates</TabsTrigger>
          <TabsTrigger value="security">Security Alerts</TabsTrigger>
          <TabsTrigger value="preferences">User Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Notification System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testMessage">Custom Test Message</Label>
                <Input
                  id="testMessage"
                  placeholder="Enter custom test message..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => sendTestNotification("transaction")}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Test Transaction
                </Button>
                <Button
                  onClick={() => sendTestNotification("system")}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Test System
                </Button>
                <Button
                  onClick={() => sendTestNotification("security")}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Test Security
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bulk System Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkMessage">System Update Message</Label>
                <Textarea
                  id="bulkMessage"
                  placeholder="Enter system update message for all users..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={sendBulkSystemUpdate} disabled={isLoading || !bulkMessage.trim()} className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Send to All Users
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="securityMessage">Security Alert Message</Label>
                <Textarea
                  id="securityMessage"
                  placeholder="Enter security alert message..."
                  value={securityMessage}
                  onChange={(e) => setSecurityMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={sendSecurityBroadcast}
                disabled={isLoading || !securityMessage.trim()}
                variant="destructive"
                className="w-full"
              >
                <Shield className="mr-2 h-4 w-4" />
                Send Security Alert
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current User Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {preferences ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Transaction Alerts</span>
                    <Badge variant={preferences.transactionAlerts ? "default" : "secondary"}>
                      {preferences.transactionAlerts ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>System Alerts</span>
                    <Badge variant={preferences.systemAlerts ? "default" : "secondary"}>
                      {preferences.systemAlerts ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Security Alerts</span>
                    <Badge variant={preferences.securityAlerts ? "default" : "secondary"}>
                      {preferences.securityAlerts ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Email Notifications</span>
                    <Badge variant={preferences.emailNotifications ? "default" : "secondary"}>
                      {preferences.emailNotifications ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>SMS Notifications</span>
                    <Badge variant={preferences.smsNotifications ? "default" : "secondary"}>
                      {preferences.smsNotifications ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Frequency</span>
                    <Badge variant="outline">{preferences.frequency || "Immediate"}</Badge>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No notification preferences found. Please configure your preferences in the Profile settings.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Display */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Notification Results</CardTitle>
            <Button variant="outline" size="sm" onClick={clearResults}>
              Clear Results
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
