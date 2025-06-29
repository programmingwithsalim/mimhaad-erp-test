"use server"

import { revalidatePath } from "next/cache"
import { createUser, deleteUser, updateUser } from "./user-service"

// Add a new user
export async function addUser(userData: any) {
  try {
    console.log("Adding user with data:", userData)

    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.role) {
      return {
        success: false,
        error: "Missing required fields: firstName, lastName, email, role",
      }
    }

    if (!userData.primaryBranchId) {
      return {
        success: false,
        error: "Primary branch is required",
      }
    }

    if (!userData.branchIds || userData.branchIds.length === 0) {
      return {
        success: false,
        error: "At least one branch assignment is required",
      }
    }

    const newUser = await createUser({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      primaryBranchId: userData.primaryBranchId,
      branchIds: userData.branchIds,
      status: userData.status || "active",
      avatar: userData.avatar || "/placeholder.svg",
    })

    // Revalidate relevant paths
    revalidatePath("/dashboard/user-management")
    revalidatePath("/dashboard/branch-management")

    console.log("User added successfully:", newUser.id)

    return {
      success: true,
      user: newUser,
      message: "User created successfully",
    }
  } catch (error) {
    console.error("Error adding user:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to add user",
    }
  }
}

// Update an existing user
export async function updateUserAction(id: string, userData: any) {
  try {
    console.log("Updating user:", id, "with data:", userData)

    const updatedUser = await updateUser(id, {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      primaryBranchId: userData.primaryBranchId,
      branchIds: userData.branchIds,
      status: userData.status,
      avatar: userData.avatar,
    })

    if (!updatedUser) {
      return {
        success: false,
        error: "User not found",
      }
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard/user-management")
    revalidatePath("/dashboard/branch-management")

    console.log("User updated successfully:", id)

    return {
      success: true,
      user: updatedUser,
      message: "User updated successfully",
    }
  } catch (error) {
    console.error(`Error updating user ${id}:`, error)
    return {
      success: false,
      error: (error as Error).message || "Failed to update user",
    }
  }
}

// Delete a user
export async function removeUser(id: string) {
  try {
    console.log("Deleting user:", id)

    const success = await deleteUser(id)

    if (!success) {
      return {
        success: false,
        error: "User not found or could not be deleted",
      }
    }

    // Revalidate relevant paths
    revalidatePath("/dashboard/user-management")
    revalidatePath("/dashboard/branch-management")

    console.log("User deleted successfully:", id)

    return {
      success: true,
      message: "User deleted successfully",
    }
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error)
    return {
      success: false,
      error: (error as Error).message || "Failed to delete user",
    }
  }
}

// Synchronize user and branch data
export async function syncUserBranchData() {
  try {
    // This is a placeholder for any sync operations needed
    console.log("Syncing user-branch data...")

    // Revalidate relevant paths
    revalidatePath("/dashboard/user-management")
    revalidatePath("/dashboard/branch-management")

    return {
      success: true,
      message: "Data synchronized successfully",
    }
  } catch (error) {
    console.error("Error synchronizing user-branch data:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to synchronize data",
    }
  }
}
