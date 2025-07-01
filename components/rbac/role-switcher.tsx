"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRBAC } from "@/hooks/use-rbac";

// This is a development-only component for testing different roles
export function RoleSwitcher() {
  const { role } = useRBAC();
  const [selectedRole, setSelectedRole] = useState(role);

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);

    // In a real app, you would update the user's role in your auth context
    // For now, we'll just store it in localStorage for testing
    localStorage.setItem("test-role", newRole);

    // Reload the page to apply the new role
    window.location.reload();
  };

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Role Switcher (Development Only)
        </CardTitle>
        <CardDescription className="text-xs">
          Current role: {role}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Select
            value={selectedRole || "Admin"}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Cashier">Cashier</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
