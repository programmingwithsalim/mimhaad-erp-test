import { fileExists, readJsonFile, writeJsonFile } from "./file-utils"

// File path
const GL_ACCOUNTS_FILE_PATH = "data/gl-accounts.json"

// GL Account interface
export interface GLAccount {
  id: string
  code: string
  name: string
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense"
  parentId?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Initialize GL accounts file if it doesn't exist
async function initGLAccountsFile() {
  try {
    const exists = await fileExists(GL_ACCOUNTS_FILE_PATH)
    if (!exists) {
      await writeJsonFile(GL_ACCOUNTS_FILE_PATH, { glAccounts: [] })
    }
    return true
  } catch (error) {
    console.error("Error initializing GL accounts file:", error)
    return false
  }
}

// Get all GL accounts
export async function getAllGLAccounts(): Promise<GLAccount[]> {
  try {
    await initGLAccountsFile()

    const data = await readJsonFile<{ glAccounts: GLAccount[] }>(GL_ACCOUNTS_FILE_PATH)
    return data.glAccounts || []
  } catch (error) {
    console.error("Error getting all GL accounts:", error)
    return []
  }
}

// Get GL account by ID
export async function getGLAccountById(id: string): Promise<GLAccount | null> {
  try {
    const accounts = await getAllGLAccounts()
    return accounts.find((account) => account.id === id) || null
  } catch (error) {
    console.error("Error getting GL account by ID:", error)
    return null
  }
}

// Create a new GL account
export async function createGLAccount(
  accountData: Omit<GLAccount, "id" | "createdAt" | "updatedAt">,
): Promise<GLAccount> {
  try {
    await initGLAccountsFile()

    const data = await readJsonFile<{ glAccounts: GLAccount[] }>(GL_ACCOUNTS_FILE_PATH)
    const glAccounts = data.glAccounts || []

    // Check if account code already exists
    const existingAccount = glAccounts.find((account) => account.code === accountData.code)
    if (existingAccount) {
      throw new Error(`GL account with code ${accountData.code} already exists`)
    }

    // Create new account
    const newAccount: GLAccount = {
      id: `gl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...accountData,
      isActive: accountData.isActive !== undefined ? accountData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    glAccounts.push(newAccount)

    await writeJsonFile(GL_ACCOUNTS_FILE_PATH, { glAccounts })

    return newAccount
  } catch (error) {
    console.error("Error creating GL account:", error)
    throw new Error(`Failed to create GL account: ${error instanceof Error ? error.message : String(error)}`)
  }
}
