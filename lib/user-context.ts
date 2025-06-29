// Create a user context to manage the current user

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// Define user roles
export type UserRole = "admin" | "manager" | "cashier" | "supervisor"

// Define user interface
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  branchId: string
  avatar?: string
}

// Sample users
const sampleUsers: User[] = [
  {
    id: "user-1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    branchId: "branch-1",
    avatar: "/letter-a-abstract.png",
  },
  {
    id: "user-2",
    name: "Branch Manager",
    email: "manager@example.com",
    role: "manager",
    branchId: "branch-2",
    avatar: "/letter-m-typography.png",
  },
  {
    id: "user-3",
    name: "Cashier",
    email: "cashier@example.com",
    role: "cashier",
    branchId: "branch-3",
    avatar: "/letter-c-typography.png",
  },
]

// Define user store interface
interface UserState {
  users: User[]
  currentUser: User | null
  setCurrentUser: (userId: string) => void
}

// Create user store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      users: sampleUsers,
      currentUser: sampleUsers[0],
      setCurrentUser: (userId: string) => {
        set((state) => {
          const user = state.users.find((u) => u.id === userId)
          return { currentUser: user || null }
        })
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
