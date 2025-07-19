import { NextResponse } from "next/server"
import { getJournalEntriesByTransactionId } from "@/lib/gl-journal-service"
import { getGLAccountById } from "@/lib/gl-account-service"

export async function GET(request: Request, { params }: { params: Promise<{ id: string  }> }) {
  try {
    const { id: transactionId } = await params

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 })
    }

    // Get journal entries for the transaction
    const journalEntries = await getJournalEntriesByTransactionId(transactionId)

    // Enhance journal entries with account names
    const enhancedEntries = await Promise.all(
      journalEntries.map(async (entry) => {
        const enhancedLines = await Promise.all(
          entry.entries.map(async (line) => {
            const account = await getGLAccountById(line.accountId)
            return {
              ...line,
              accountName: account ? `${account.code} - ${account.name}` : undefined,
            }
          }),
        )

        return {
          ...entry,
          entries: enhancedLines,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      journalEntries: enhancedEntries,
    })
  } catch (error) {
    console.error("Error getting journal entries by transaction ID:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get journal entries" },
      { status: 500 },
    )
  }
}
