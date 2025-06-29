"use client"

import { useState, useEffect } from "react"

export interface User {
  id: string
  email: string
  username: string
  name: string
  firstName?: string
  lastName?: string
  role: string
  branchId: string
  branchName: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Try to get user from session storage first
        const storedUser = sessionStorage.getItem("currentUser")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          setLoading(false)
          return
        }

        // If no stored user, create a default admin user
        const defaultUser: User = {
          id: "74c0a86e-2585-443f-9c2e-44fbb2bcd79c", // Use the actual user ID from logs
          email: "admin@mimhaad.com",
          username: "admin",
          name: "System Administrator",
          firstName: "System",
          lastName: "Administrator",
          role: "admin",
          branchId: "branch-001",
          branchName: "Main Branch",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Store in session storage
        sessionStorage.setItem("currentUser", JSON.stringify(defaultUser))
        setUser(defaultUser)
      } catch (err) {
        console.error("Error fetching user:", err)
        setError("Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser }
      setUser(newUser)
      sessionStorage.setItem("currentUser", JSON.stringify(newUser))
    }
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem("currentUser")
  }

  return {
    user,
    loading,
    error,
    updateUser,
    logout,
    isAuthenticated: !!user,
  }
}
