import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth-service"
import { NotificationService } from "@/lib/services/notification-service"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { amount, notes } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const { user } = session
    const accountId = params.id

    // Get current account details
    const account = await sql`
      SELECT * FROM float_accounts WHERE id = ${accountId}
    `

    if (account.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const currentAccount = account[0]
    const newBalance = Number(currentAccount.current_balance) + Number(amount)

    // Update account balance
    await sql`
      UPDATE float_accounts 
      SET current_balance = ${newBalance}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${accountId}
    `

    // Record transaction
    await sql`
      INSERT INTO float_transactions (
        id, account_id, type, amount, balance_before, balance_after,
        description, created_by, branch_id, created_at
      ) VALUES (
        gen_random_uuid(),
        ${accountId},
        'recharge',
        ${amount},
        ${currentAccount.current_balance},
        ${newBalance},
        ${notes || `Float recharge of ${amount}`},
        ${user.id},
        ${user.branchId},
        CURRENT_TIMESTAMP
      )
    `

    // Check if balance was low and send notification if it's now above threshold
    const threshold = 5000 // You can make this configurable
    if (Number(currentAccount.current_balance) < threshold && newBalance >= threshold) {
      try {
        await NotificationService.sendNotification({
          type: "system_alert",
          title: "Float Account Recharged",
          message: `Float account "${currentAccount.provider}" has been recharged with GHS ${amount}. New balance: GHS ${newBalance.toFixed(2)}`,
          userId: user.id,
          branchId: user.branchId,
          priority: "medium",
          metadata: {
            accountId,
            accountName: currentAccount.provider,
            rechargeAmount: amount,
            newBalance,
            previousBalance: currentAccount.current_balance,
          },
        })
      } catch (notificationError) {
        console.error("Failed to send recharge notification:", notificationError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account recharged successfully",
      newBalance,
    })
  } catch (error) {
    console.error("Error recharging account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
