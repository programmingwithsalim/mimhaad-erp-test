import { readJsonFile } from "./file-utils"
import { db } from "./db"

export async function seedPartnerBanksAsFloatAccounts(branchId: string) {
  try {
    console.log(`Seeding partner banks as float accounts for branch ${branchId}...`)

    // Read partner banks from seed file
    const data = await readJsonFile("data/partner-banks-seed.json")
    const banks = data.banks || []

    // For each bank, create a float account if it doesn't exist
    for (const bank of banks) {
      // Check if this bank already exists as a float account for this branch
      const existingAccount = await db.query(
        `
        SELECT id FROM float_accounts 
        WHERE account_type = 'partner-bank' 
        AND provider = $1 
        AND branch_id = $2
      `,
        [bank.code, branchId],
      )

      if (existingAccount.rows.length === 0) {
        // Create a new float account for this bank
        const metadata = {
          transferFee: bank.transferFee,
          minFee: bank.minFee,
          maxFee: bank.maxFee,
          bankId: bank.id,
        }

        await db.query(
          `
          INSERT INTO float_accounts (
            account_name, 
            account_type, 
            provider, 
            branch_id, 
            current_balance, 
            min_threshold, 
            max_threshold, 
            is_active, 
            metadata,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
          )
        `,
          [
            bank.name,
            "partner-bank",
            bank.code,
            branchId,
            10000, // Initial balance of 10,000
            5000, // Min threshold
            50000, // Max threshold
            bank.status === "active",
            JSON.stringify(metadata),
          ],
        )

        console.log(`Created float account for ${bank.name} (${bank.code})`)
      } else {
        console.log(`Float account for ${bank.name} (${bank.code}) already exists`)
      }
    }

    console.log("Partner banks seeding completed successfully")
    return { success: true, message: "Partner banks seeded successfully" }
  } catch (error) {
    console.error("Error seeding partner banks:", error)
    return { success: false, message: `Error seeding partner banks: ${error}` }
  }
}
