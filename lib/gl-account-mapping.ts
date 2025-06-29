import { GLDatabase } from "./gl-database"

/**
 * Get GL accounts for MoMo transaction with fallback creation
 */
export async function getGLAccountsForMoMoTransaction(
  type: string,
): Promise<{ debitAccount: any; creditAccount: any }> {
  let debitAccountCode: string
  let creditAccountCode: string

  switch (type) {
    case "cash-in":
      debitAccountCode = "1001" // Cash
      creditAccountCode = "2001" // Customer Liability
      break
    case "cash-out":
      debitAccountCode = "2001" // Customer Liability
      creditAccountCode = "1001" // Cash
      break
    case "transfer":
      debitAccountCode = "2001" // Customer Liability (source)
      creditAccountCode = "2001" // Customer Liability (destination)
      break
    case "payment":
      debitAccountCode = "2001" // Customer Liability
      creditAccountCode = "2002" // Merchant Payable
      break
    case "commission":
      debitAccountCode = "1001" // Cash
      creditAccountCode = "4001" // Commission Revenue
      break
    default:
      throw new Error(`Unknown MoMo transaction type: ${type}`)
  }

  try {
    let debitAccount = await GLDatabase.getGLAccountByCode(debitAccountCode)
    let creditAccount = await GLDatabase.getGLAccountByCode(creditAccountCode)

    // If accounts don't exist, create them
    if (!debitAccount) {
      debitAccount = await createMissingGLAccount(debitAccountCode)
    }

    if (!creditAccount) {
      creditAccount = await createMissingGLAccount(creditAccountCode)
    }

    if (!debitAccount || !creditAccount) {
      throw new Error(`Failed to create or find GL accounts: debit=${debitAccountCode}, credit=${creditAccountCode}`)
    }

    return { debitAccount, creditAccount }
  } catch (error) {
    console.error(`Error getting GL accounts for MoMo transaction type ${type}:`, error)
    throw error
  }
}

/**
 * Get GL accounts for MoMo fee with fallback creation
 */
export async function getGLAccountsForMoMoFee(): Promise<{ debitAccount: any; creditAccount: any }> {
  try {
    let debitAccount = await GLDatabase.getGLAccountByCode("2001") // Customer Liability
    let creditAccount = await GLDatabase.getGLAccountByCode("4003") // Fee Income

    // If accounts don't exist, create them
    if (!debitAccount) {
      debitAccount = await createMissingGLAccount("2001")
    }

    if (!creditAccount) {
      creditAccount = await createMissingGLAccount("4003")
    }

    if (!debitAccount || !creditAccount) {
      throw new Error("Failed to create or find GL accounts for MoMo fee")
    }

    return { debitAccount, creditAccount }
  } catch (error) {
    console.error("Error getting GL accounts for MoMo fee:", error)
    throw error
  }
}

/**
 * Create missing GL account with predefined structure
 */
async function createMissingGLAccount(code: string): Promise<any> {
  const accountDefinitions = {
    "1001": {
      code: "1001",
      name: "Cash",
      type: "asset",
      parentCode: null,
      description: "Cash and cash equivalents",
    },
    "2001": {
      code: "2001",
      name: "Customer Liability",
      type: "liability",
      parentCode: null,
      description: "Customer deposits and liabilities",
    },
    "2002": {
      code: "2002",
      name: "Merchant Payable",
      type: "liability",
      parentCode: null,
      description: "Amounts payable to merchants",
    },
    "2003": {
      code: "2003",
      name: "Bank Partner Liability",
      type: "liability",
      parentCode: null,
      description: "Liabilities to bank partners",
    },
    "4001": {
      code: "4001",
      name: "Commission Revenue",
      type: "revenue",
      parentCode: null,
      description: "Commission income from transactions",
    },
    "4002": {
      code: "4002",
      name: "Agency Banking Revenue",
      type: "revenue",
      parentCode: null,
      description: "Revenue from agency banking services",
    },
    "4003": {
      code: "4003",
      name: "Fee Income",
      type: "revenue",
      parentCode: null,
      description: "Fee income from various services",
    },
  }

  const definition = accountDefinitions[code]
  if (!definition) {
    throw new Error(`No definition found for GL account code: ${code}`)
  }

  try {
    return await GLDatabase.createGLAccount(definition)
  } catch (error) {
    console.error(`Failed to create GL account ${code}:`, error)
    throw error
  }
}
