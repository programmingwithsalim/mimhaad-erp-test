"use server"

import { revalidatePath } from "next/cache"
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch as deleteBranchService,
  searchBranches as searchBranchesService,
} from "./branch-service"

// Fetch all branches
export async function fetchBranches() {
  try {
    const branches = await getAllBranches()
    return { data: branches }
  } catch (error) {
    console.error("Error fetching branches:", error)
    return { error: "Failed to fetch branches" }
  }
}

// Fetch a single branch by ID
export async function fetchBranchById(id: string) {
  try {
    const branch = await getBranchById(id)
    if (!branch) {
      return { error: "Branch not found" }
    }
    return { data: branch }
  } catch (error) {
    console.error(`Error fetching branch ${id}:`, error)
    return { error: "Failed to fetch branch" }
  }
}

// Add a new branch
export async function addBranch(branchData: any) {
  try {
    const branch = await createBranch(branchData)
    revalidatePath("/dashboard/branch-management")
    return { data: branch }
  } catch (error) {
    console.error("Error adding branch:", error)
    return { error: "Failed to add branch" }
  }
}

// Edit an existing branch
export async function editBranch(id: string, branchData: any) {
  try {
    const branch = await updateBranch(id, branchData)
    if (!branch) {
      return { error: "Branch not found" }
    }
    revalidatePath("/dashboard/branch-management")
    return { data: branch }
  } catch (error) {
    console.error(`Error updating branch ${id}:`, error)
    return { error: "Failed to update branch" }
  }
}

// Delete a branch
export async function removeBranch(id: string) {
  try {
    const success = await deleteBranchService(id)
    if (!success) {
      return { error: "Branch not found" }
    }
    revalidatePath("/dashboard/branch-management")
    return { success: true }
  } catch (error) {
    console.error(`Error deleting branch ${id}:`, error)
    return { error: "Failed to delete branch" }
  }
}

// Search branches
export async function searchBranchesAction(query: string) {
  try {
    const branches = await searchBranchesService(query)
    return { data: branches }
  } catch (error) {
    console.error(`Error searching branches for "${query}":`, error)
    return { error: "Failed to search branches" }
  }
}
