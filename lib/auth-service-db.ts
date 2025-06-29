import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"
import {
  createDatabaseSession,
  getDatabaseSession,
  deleteDatabaseSession,
  updateSessionActivity,
  type SessionUser,
  type DatabaseSession,
} from "./database-session-service"
import type { NextRequest } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Get user by email with branch information
export async function getUserByEmail(email: string) {
  try {
    const users = await sql`
      SELECT 
        u.id,
        u.first_name as "firstName", 
        u.last_name as "lastName", 
        u.email, 
        u.role, 
        u.primary_branch_id as "primaryBranchId", 
        u.phone, 
        u.status, 
        u.password_hash as "passwordHash",
        u.last_login as "lastLogin", 
        u.created_at as "createdAt", 
        u.updated_at as "updatedAt", 
        u.avatar,
        b.name as "primaryBranchName",
        b.type as "branchType",
        b.address as "branchAddress"
      FROM users u
      LEFT JOIN branches b ON u.primary_branch_id = b.id
      WHERE u.email = ${email} AND u.status = 'active'
      LIMIT 1
    `

    return users[0] || null
  } catch (error) {
    console.error("Error getting user by email:", error)
    throw error
  }
}

// Get user by ID with branch information
export async function getUserById(userId: string) {
  try {
    const users = await sql`
      SELECT 
        u.id,
        u.first_name as "firstName", 
        u.last_name as "lastName", 
        u.email, 
        u.role, 
        u.primary_branch_id as "primaryBranchId", 
        u.phone, 
        u.status, 
        u.last_login as "lastLogin", 
        u.created_at as "createdAt", 
        u.updated_at as "updatedAt", 
        u.avatar,
        b.name as "primaryBranchName",
        b.type as "branchType",
        b.address as "branchAddress"
      FROM users u
      LEFT JOIN branches b ON u.primary_branch_id = b.id
      WHERE u.id = ${userId} AND u.status = 'active'
      LIMIT 1
    `

    return users[0] || null
  } catch (error) {
    console.error("Error getting user by ID:", error)
    throw error
  }
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// Authenticate user and create session
export async function authenticate(
  email: string,
  password: string,
  request?: NextRequest,
): Promise<SessionUser | null> {
  try {
    console.log("Authenticating user:", email)
    const user = await getUserByEmail(email)
    if (!user) {
      console.log("User not found")
      return null
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      console.log("Invalid password")
      return null
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      branchId: user.primaryBranchId,
      branchName: user.primaryBranchName,
      branchType: user.branchType,
      phone: user.phone,
      avatar: user.avatar,
    }

    // Create database session
    await createDatabaseSession(sessionUser, request)

    console.log("Authentication successful")
    return sessionUser
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

// Get current session with full user data
export async function getSession(request?: NextRequest): Promise<DatabaseSession | null> {
  const session = await getDatabaseSession(request)

  if (session && session.userId) {
    // Get fresh user data from database
    const userData = await getUserById(session.userId)
    if (userData) {
      // Update session with fresh user data
      session.user = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: `${userData.firstName} ${userData.lastName}`,
        role: userData.role,
        branchId: userData.primaryBranchId,
        branchName: userData.primaryBranchName,
        branchType: userData.branchType,
        phone: userData.phone,
        avatar: userData.avatar,
      }
    }

    // Update session activity
    await updateSessionActivity(session.sessionToken)
  }

  return session
}

// Logout and delete session
export async function logout(): Promise<void> {
  await deleteDatabaseSession()
}

// Export types
export type { SessionUser, DatabaseSession }
