"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft, Home, AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const router = useRouter();

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your current role ({user.role}) does not have the required
              permissions to access this page or perform this action.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              If you believe this is an error, please contact your
              administrator.
            </p>
            <p>You can:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Go back to the previous page</li>
              <li>Return to your dashboard</li>
              <li>Contact support for assistance</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
