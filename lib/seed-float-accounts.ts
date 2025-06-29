import { fileExists, readJsonFile, writeJsonFile } from "./file-utils"
import { getAllBranches } from "./branch-service"

// File path for float accounts
const FLOAT_ACCOUNTS_FILE_PATH = "data/float-accounts.json"

// Float Account interface
interface FloatAccount {
  id: string
  branchId: string
  accountType: string
  provider?: string
  accountNumber?: string
  currentBalance: number
  minThreshold: number
  maxThreshold: number
  lastUpdated: string
  createdBy: string
  createdAt: string
}

/**
 * Seed float accounts for all branches
 */
export async function seedFloatAccounts() {
  try {
    // Check if accounts file exists
    const exists = await fileExists(FLOAT_ACCOUNTS_FILE_PATH)

    // If file exists, don't seed
    if (exists) {
      const data = await readJsonFile<{ accounts: FloatAccount[] }>(FLOAT_ACCOUNTS_FILE_PATH)
      if (data.accounts && data.accounts.length > 0) {
        console.log("Float accounts already seeded")
        return
      }
    }

    // Get all branches
    const branches = await getAllBranches()

    if (branches.length === 0) {
      console.log("No branches found for seeding float accounts")
      return
    }

    // Generate accounts for each branch
    const accounts: FloatAccount[] = []
    const now = new Date().toISOString()

    for (const branch of branches) {
      // Cash in till account
      accounts.push({
        id: `cash-${branch.id}-${Date.now()}`,
        branchId: branch.id,
        accountType: "cash-in-till",
        currentBalance: 5000,
        minThreshold: 1000,
        maxThreshold: 10000,
        lastUpdated: now,
        createdBy: "system",
        createdAt: now,
      })

      // MTN MoMo account
      accounts.push({
        id: `momo-mtn-${branch.id}-${Date.now()}`,
        branchId: branch.id,
        accountType: "momo",
        provider: "MTN",
        accountNumber: `233${Math.floor(Math.random() * 900000000) + 100000000}`,
        currentBalance: 10000,
        minThreshold: 2000,
        maxThreshold: 50000,
        lastUpdated: now,
        createdBy: "system",
        createdAt: now,
      })

      // Vodafone MoMo account
      accounts.push({
        id: `momo-vodafone-${branch.id}-${Date.now()}`,
        branchId: branch.id,
        accountType: "momo",
        provider: "Vodafone",
        accountNumber: `233${Math.floor(Math.random() * 900000000) + 100000000}`,
        currentBalance: 8000,
        minThreshold: 1500,
        maxThreshold: 40000,
        lastUpdated: now,
        createdBy: "system",
        createdAt: now,
      })

      // AirtelTigo MoMo account
      accounts.push({
        id: `momo-airtel-${branch.id}-${Date.now()}`,
        branchId: branch.id,
        accountType: "momo",
        provider: "AirtelTigo",
        accountNumber: `233${Math.floor(Math.random() * 900000000) + 100000000}`,
        currentBalance: 7000,
        minThreshold: 1200,
        maxThreshold: 35000,
        lastUpdated: now,
        createdBy: "system",
        createdAt: now,
      })

      // E-Zwich account
      accounts.push({
        id: `ezwich-${branch.id}-${Date.now()}`,
        branchId: branch.id,
        accountType: "e-zwich",
        accountNumber: `GH${Math.floor(Math.random() * 9000000) + 1000000}`,
        currentBalance: 15000,
        minThreshold: 3000,
        maxThreshold: 100000,
        lastUpdated: now,
        createdBy: "system",
        createdAt: now,
      })
    }

    // Write accounts to file
    await writeJsonFile(FLOAT_ACCOUNTS_FILE_PATH, { accounts })
    console.log(`Seeded ${accounts.length} float accounts for ${branches.length} branches`)
  } catch (error) {
    console.error("Error seeding float accounts:", error)
  }
}
