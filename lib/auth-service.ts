import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { sql } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  branchId?: string
  branchName?: string
}

export interface SessionData {
  user: SessionUser
  expires: string
}

// Get user by email
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
        b.name as "primaryBranchName"
      FROM users u
      LEFT JOIN branches b ON u.primary_branch_id = b.id
      WHERE u.email = ${email} AND u.status = 'active'
      LIMIT 1
    `

    return users[0] || null
  } catch (error) {
    console.error("Error getting user by email:", error)
    return null
  }
}

// Get user by ID
export async function getUserById(id: string) {
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
        b.name as "primaryBranchName"
      FROM users u
      LEFT JOIN branches b ON u.primary_branch_id = b.id
      WHERE u.id = ${id} AND u.status = 'active'
      LIMIT 1
    `

    return users[0] || null
  } catch (error) {
    console.error("Error getting user by ID:", error)
    return null
  }
}

// Create JWT token
export async function createToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET)
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as SessionData
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 12
    return await bcrypt.hash(password, saltRounds)
  } catch (error) {
    console.error("Error hashing password:", error)
    throw new Error("Failed to hash password")
  }
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error("Error verifying password:", error)
    return false
  }
}

// Create session (JWT fallback)
export async function createSession(user: SessionUser) {
  const token = await createToken(user)
  const expires = new Date(Date.now() + SESSION_DURATION)

  console.log("Creating JWT session for user:", user.email)

  cookies().set("session", token, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  return { token, expires }
}

// Get session from request (JWT fallback)
export async function getSession(request?: NextRequest): Promise<SessionData | null> {
  let token: string | undefined

  try {
    if (request) {
      token = request.cookies.get("session")?.value
    } else {
      token = cookies().get("session")?.value
    }

    if (!token) {
      console.log("No session token found")
      return null
    }

    const session = await verifyToken(token)
    console.log("Session verification:", session ? "Valid" : "Invalid")
    return session
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

// Delete session
export async function deleteSession() {
  console.log("Deleting session")

  cookies().set("session", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
}

// Authenticate user
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
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

    // Try to update last login (non-blocking)
    try {
      await sql`
        UPDATE users 
        SET last_login = NOW() 
        WHERE id = ${user.id}
      `
    } catch (error) {
      console.error("Error updating last login:", error)
    }

    console.log("Authentication successful")
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      branchId: user.primaryBranchId,
      branchName: user.primaryBranchName,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

// Refresh session
export async function refreshSession(): Promise<SessionData | null> {
  const session = await getSession()
  if (!session) return null

  // Check if user still exists and is active
  const user = await getUserById(session.user.id)
  if (!user || user.status !== "active") {
    await deleteSession()
    return null
  }

  // Create new session with updated user data
  const updatedUser: SessionUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    branchId: user.primaryBranchId,
    branchName: user.primaryBranchName,
  }

  await createSession(updatedUser)
  return { user: updatedUser, expires: new Date(Date.now() + SESSION_DURATION).toISOString() }
}

// Export types
export type { SessionUser, SessionData }
