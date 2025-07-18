"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  branchId?: string;
  branchName?: string;
  phone?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: async () => {},
  refreshSession: async () => {},
  updateUser: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log("Checking session...");

      const response = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Session check successful:", !!data.user);
        if (data.user) {
          // Ensure all user fields are properly mapped
          const userData = {
            ...data.user,
            name:
              data.user.name ||
              `${data.user.firstName || ""} ${data.user.lastName || ""}`.trim(),
          };
          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        console.log("Session check failed:", response.status);
        setUser(null);
      }
    } catch (error) {
      console.error("Session check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Logging in...");
      setIsLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Login successful, user data:", data.user);

        // Ensure all user fields are properly mapped
        const userData = {
          ...data.user,
          name:
            data.user.name ||
            `${data.user.firstName || ""} ${data.user.lastName || ""}`.trim(),
        };

        console.log("Setting user data:", userData);
        setUser(userData);

        // Add a small delay to ensure state is updated before redirect
        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log("Redirecting to dashboard...");
        router.push("/dashboard");

        // Force a page refresh after a short delay to ensure all components load with correct role
        setTimeout(() => {
          console.log("Force refreshing page to ensure proper role loading...");
          window.location.reload();
        }, 500);

        return true;
      } else {
        const errorData = await response.json();
        console.error("Login failed:", errorData.error);
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out...");
      setIsLoading(true);

      // Call logout API to invalidate database session
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        console.log("Logout API successful");
      } else {
        console.error("Logout API failed:", response.status);
      }

      // Clear user state immediately
      setUser(null);

      // Redirect to login page (root path)
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear user state and redirect on error
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          const userData = {
            ...data.user,
            name:
              data.user.name ||
              `${data.user.firstName || ""} ${data.user.lastName || ""}`.trim(),
          };
          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Session refresh failed:", error);
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, refreshSession, updateUser, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
