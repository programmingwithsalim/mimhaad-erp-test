"use client";

import { useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  role: string;
  branchId: string;
  branchName?: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clear any potentially outdated localStorage data first
        localStorage.removeItem("currentUser");

        // Try to get user from session API
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.user && sessionData.user.id !== "System") {
            console.log("Got valid user from session API:", sessionData.user);
            setUser(sessionData.user);
            // Store in localStorage for future use (only after successful validation)
            localStorage.setItem(
              "currentUser",
              JSON.stringify(sessionData.user)
            );
          } else {
            throw new Error("Invalid user session");
          }
        } else {
          throw new Error("No valid session found");
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
        setError(
          err instanceof Error ? err.message : "Failed to get user info"
        );

        // Clear any invalid stored data
        localStorage.removeItem("currentUser");

        // Set a default user for development (remove in production)
        if (process.env.NODE_ENV === "development") {
          const defaultUser: CurrentUser = {
            id: "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", // Valid UUID
            name: "Test User",
            firstName: "Test",
            lastName: "User",
            username: "testuser",
            email: "test@example.com",
            role: "manager",
            branchId: "635844ab-029a-43f8-8523-d7882915266a", // Valid UUID
            branchName: "Main Branch",
          };
          console.log("Using default development user:", defaultUser);
          setUser(defaultUser);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error };
}
