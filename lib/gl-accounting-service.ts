import type { JournalEntry } from "./gl-journal-service"
import { fileExists, readJsonFile, writeJsonFile } from "./file-utils"

// File paths
const JOURNAL_ENTRIES_FILE_PATH = "data/gl-journal-entries.json"
const ACCOUNT_BALANCES_FILE_PATH = "data/gl-account-balances.json"

// Initialize files if they don't exist
async function initGLFiles() {
  try {
    const journalExists = await fileExists(JOURNAL_ENTRIES_FILE_PATH)
    if (!journalExists) {
      await writeJsonFile(JOURNAL_ENTRIES_FILE_PATH, { journalEntries: [] })
    }

    const balancesExists = await fileExists(ACCOUNT_BALANCES_FILE_PATH)
    if (!balancesExists) {
      await writeJsonFile(ACCOUNT_BALANCES_FILE_PATH, { accountBalances: {} })
    }

    return true
  } catch (error) {
    console.error("Error initializing GL files:", error)
    return false
  }
}

// Create a journal entry
export async function createJournalEntry(journalEntry: JournalEntry): Promise<JournalEntry> {
  try {
    await initGLFiles()

    const data = await readJsonFile<{ journalEntries: JournalEntry[] }>(JOURNAL_ENTRIES_FILE_PATH)
    const journalEntries = data.journalEntries || []

    journalEntries.push(journalEntry)

    await writeJsonFile(JOURNAL_ENTRIES_FILE_PATH, { journalEntries })

    return journalEntry
  } catch (error) {
    console.error("Error creating journal entry:", error)
    throw new Error(`Failed to create journal entry: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Post a journal entry (update account balances)
export async function postJournalEntry(journalEntryId: string, userId: string): Promise<JournalEntry | null> {
  try {
    await initGLFiles()

    // Get the journal entry
    const journalData = await readJsonFile<{ journalEntries: JournalEntry[] }>(JOURNAL_ENTRIES_FILE_PATH)
    const journalEntries = journalData.journalEntries || []

    const entryIndex = journalEntries.findIndex((entry) => entry.id === journalEntryId)
    if (entryIndex === -1) {
      return null
    }

    const journalEntry = journalEntries[entryIndex]
    if (journalEntry.status !== "pending") {
      return null
    }

    // Get account balances
    const balancesData = await readJsonFile<{ accountBalances: Record<string, number> }>(ACCOUNT_BALANCES_FILE_PATH)
    const accountBalances = balancesData.accountBalances || {}

    // Update account balances
    journalEntry.entries.forEach((line) => {
      const accountId = line.accountId

      if (!accountBalances[accountId]) {
        accountBalances[accountId] = 0
      }

      if (line.debit) {
        accountBalances[accountId] += line.debit
      }

      if (line.credit) {
        accountBalances[accountId] -= line.credit
      }
    })

    // Update journal entry status
    journalEntry.status = "posted"
    journalEntry.postedBy = userId
    journalEntry.postedAt = new Date().toISOString()

    journalEntries[entryIndex] = journalEntry

    // Save updated data
    await writeJsonFile(JOURNAL_ENTRIES_FILE_PATH, { journalEntries })
    await writeJsonFile(ACCOUNT_BALANCES_FILE_PATH, { accountBalances })

    return journalEntry
  } catch (error) {
    console.error("Error posting journal entry:", error)
    return null
  }
}
