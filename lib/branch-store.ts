import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getAllBranches } from "./branch-service"

export interface Branch {
  id: string
  name: string
  code: string
  location: string
  region: string
  manager: string
  contactPhone?: string
  email?: string
  staffCount: number
  status: string
  floatBalance?: number
  lastFloatUpdate?: string
  createdAt: string
  updatedAt: string
}

interface BranchState {
  branches: Branch[]
  isLoading: boolean
  error: string | null
  initialized: boolean
  fetchBranches: () => Promise<void>
  addBranch: (branch: Branch) => void
  updateBranch: (id: string, branch: Partial<Branch>) => void
  removeBranch: (id: string) => void
  getBranchById: (id: string) => Branch | undefined
  getBranchesByStatus: (status: string) => Branch[]
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      isLoading: false,
      error: null,
      initialized: false,

      fetchBranches: async () => {
        // Skip if already initialized and has branches
        if (get().initialized && get().branches.length > 0) {
          return
        }

        set({ isLoading: true, error: null })
        try {
          const branches = await getAllBranches()
          set({ branches, isLoading: false, initialized: true })
        } catch (error) {
          console.error("Error fetching branches:", error)
          set({ error: "Failed to fetch branches", isLoading: false })
        }
      },

      addBranch: (branch) => {
        set((state) => ({
          branches: [...state.branches, branch],
        }))
      },

      updateBranch: (id, updatedBranch) => {
        set((state) => ({
          branches: state.branches.map((branch) => (branch.id === id ? { ...branch, ...updatedBranch } : branch)),
        }))
      },

      removeBranch: (id) => {
        set((state) => ({
          branches: state.branches.filter((branch) => branch.id !== id),
        }))
      },

      getBranchById: (id) => {
        return get().branches.find((branch) => branch.id === id)
      },

      getBranchesByStatus: (status) => {
        return get().branches.filter((branch) => branch.status === status)
      },
    }),
    {
      name: "branch-store",
      skipHydration: true,
    },
  ),
)
