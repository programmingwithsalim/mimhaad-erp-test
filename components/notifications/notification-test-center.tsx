"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Settings,
  TestTube,
  AlertTriangle,
} from "lucide-react";

interface TestResult {
  id: string;
  type: string;
  status: "success" | "error" | "pending";
  message: string;
  timestamp: Date;
  details?: any;
}

export function NotificationTestCenter() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Test form states
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "This is a test notification from your FinTech platform."
  );
  const [notificationType, setNotificationType] = useState("email");
  const [scenarioType, setScenarioType] = useState("transaction_alert");

  const [smsProvider, setSmsProvider] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsApiSecret, setSmsApiSecret] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");
  const [smsWebhookUrl, setSmsWebhookUrl] = useState("");
  const [smsTestMode, setSmsTestMode] = useState(false);
  const [smsProvidersConfig, setSmsProvidersConfig] = useState<any>({});

  useEffect(() => {
    // Fetch system config on mount
    fetch("/api/settings/system-config")
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          const configData = result.data.reduce((acc: any, config: any) => {
            acc[config.config_key] = config.config_value;
            return acc;
          }, {});
          // Extract SMS provider info
          setSmsProvidersConfig({
            hubtel: {
              smsApiKey: configData.sms_api_key || "",
              smsApiSecret: configData.sms_api_secret || "",
              smsSenderId: configData.sms_sender_id || "",
              smsWebhookUrl: configData.sms_webhook_url || "",
              smsTestMode: configData.sms_test_mode === "true",
            },
            smsonlinegh: {
              smsApiKey: configData.sms_api_key || "",
              smsApiSecret: configData.sms_api_secret || "",
              smsSenderId: configData.sms_sender_id || "",
              smsWebhookUrl: configData.sms_webhook_url || "",
              smsTestMode: configData.sms_test_mode === "true",
            },
            // Add more providers as needed
          });
          setSmsProvider(configData.sms_provider || "hubtel");
        }
      });
  }, []);

  useEffect(() => {
    // Auto-populate fields when provider changes
    if (smsProvider && smsProvidersConfig[smsProvider]) {
      const cfg = smsProvidersConfig[smsProvider];
      setSmsApiKey(cfg.smsApiKey || "");
      setSmsApiSecret(cfg.smsApiSecret || "");
      setSmsSenderId(cfg.smsSenderId || "");
      setSmsWebhookUrl(cfg.smsWebhookUrl || "");
      setSmsTestMode(cfg.smsTestMode || false);
    }
  }, [smsProvider, smsProvidersConfig]);

  const addTestResult = (result: Omit<TestResult, "id" | "timestamp">) => {
    const newResult: TestResult = {
      ...result,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setTestResults((prev) => [newResult, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testBasicEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Validation Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    addTestResult({
      type: "Basic Email Test",
      status: "pending",
      message: `Sending test email to ${testEmail}...`,
    });

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "email",
          recipient: testEmail,
          subject: "Test Email from FinTech Platform",
          message: testMessage,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addTestResult({
          type: "Basic Email Test",
          status: "success",
          message: `Email sent successfully to ${testEmail}`,
          details: result,
        });
        toast({
          title: "Success",
          description: "Test email sent successfully!",
        });
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      addTestResult({
        type: "Basic Email Test",
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to send email",
        details: error,
      });
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testBasicSMS = async () => {
    if (!testPhone) {
      toast({
        title: "Validation Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    addTestResult({
      type: "Basic SMS Test",
      status: "pending",
      message: `Sending test SMS to ${testPhone}...`,
    });
    try {
      const response = await fetch("/api/notifications/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Optionally, you could allow custom message/phone via body
      });
      const result = await response.json();
      if (result.success) {
        addTestResult({
          type: "Basic SMS Test",
          status: "success",
          message: `SMS sent successfully to ${testPhone}`,
          details: result,
        });
        toast({
          title: "Success",
          description: "Test SMS sent successfully!",
        });
      } else {
        throw new Error(result.error || "Failed to send SMS");
      }
    } catch (error) {
      addTestResult({
        type: "Basic SMS Test",
        status: "error",
        message: error instanceof Error ? error.message : "Failed to send SMS",
        details: error,
      });
      toast({
        title: "Error",
        description: "Failed to send test SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testScenario = async () => {
    setLoading(true);
    addTestResult({
      type: `Scenario: ${scenarioType}`,
      status: "pending",
      message: `Testing ${scenarioType.replace("_", " ")} scenario...`,
    });

    try {
      const response = await fetch("/api/notifications/test-scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenario: scenarioType,
          recipient: testEmail,
          phone: testPhone,
        }),
      });

      const result = await response.json();

      if (result.success) {
        addTestResult({
          type: `Scenario: ${scenarioType}`,
          status: "success",
          message: `Scenario test completed successfully`,
          details: result,
        });
        toast({
          title: "Success",
          description: "Scenario test completed successfully!",
        });
      } else {
        throw new Error(result.error || "Scenario test failed");
      }
    } catch (error) {
      addTestResult({
        type: `Scenario: ${scenarioType}`,
        status: "error",
        message:
          error instanceof Error ? error.message : "Scenario test failed",
        details: error,
      });
      toast({
        title: "Error",
        description: "Scenario test failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConfiguration = async () => {
    setLoading(true);
    addTestResult({
      type: "Configuration Test",
      status: "pending",
      message: "Testing notification configuration...",
    });

    try {
      const response = await fetch("/api/notifications/test-config", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        addTestResult({
          type: "Configuration Test",
          status: "success",
          message: "Configuration test passed",
          details: result,
        });
        toast({
          title: "Success",
          description: "Configuration test passed!",
        });
      } else {
        throw new Error(result.error || "Configuration test failed");
      }
    } catch (error) {
      addTestResult({
        type: "Configuration Test",
        status: "error",
        message:
          error instanceof Error ? error.message : "Configuration test failed",
        details: error,
      });
      toast({
        title: "Error",
        description: "Configuration test failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Success
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Info */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>Current Configuration:</strong>
          <br />• Email Provider: Resend API
          <br />• From Email: programmingwithsalim@gmail.com
          <br />• SMS Provider: Not configured (Twilio integration pending)
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Basic Tests
            </CardTitle>
            <CardDescription>
              Test individual notification components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testMessage">Test Message</Label>
              <Textarea
                id="testMessage"
                placeholder="Enter your test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testBasicEmail}
                disabled={loading || !testEmail}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Test Email
              </Button>
              <Button
                onClick={testBasicSMS}
                disabled={loading || !testPhone}
                className="flex-1"
                variant="secondary"
              >
                <Send className="h-4 w-4 mr-2" />
                Test SMS
              </Button>
              <Button
                onClick={testConfiguration}
                disabled={loading}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Test Config
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scenario Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Scenario Tests
            </CardTitle>
            <CardDescription>
              Test real-world notification scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scenarioType">Scenario Type</Label>
              <Select value={scenarioType} onValueChange={setScenarioType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transaction_alert">
                    High-Value Transaction Alert
                  </SelectItem>
                  <SelectItem value="low_balance">
                    Low Balance Warning
                  </SelectItem>
                  <SelectItem value="security_alert">Security Alert</SelectItem>
                  <SelectItem value="system_maintenance">
                    System Maintenance
                  </SelectItem>
                  <SelectItem value="approval_request">
                    Approval Request
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testPhone">Test Phone (Optional)</Label>
              <Input
                id="testPhone"
                type="tel"
                placeholder="+233XXXXXXXXX"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>

            <Button
              onClick={testScenario}
              disabled={loading || !testEmail}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Test Scenario
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Recent notification test results (last 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No test results yet. Run a test to see results here.
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.type}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
