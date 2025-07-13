import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth-service";
import { NotificationService } from "@/lib/services/notification-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      amount,
      sourceAccountId,
      rechargeMethod = "manual",
      reference,
      notes,
      description,
    } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { user } = session;
    const accountId = params.id;
    const rechargeAmount = Number(amount);

    // Get target account details
    const targetAccount = await sql`
      SELECT * FROM float_accounts WHERE id = ${accountId}
    `;

    if (targetAccount.length === 0) {
      return NextResponse.json(
        { error: "Target account not found" },
        { status: 404 }
      );
    }

    const currentTargetAccount = targetAccount[0];
    const currentBalance = Number(currentTargetAccount.current_balance);

    // If source account is specified, validate and deduct from it
    if (sourceAccountId) {
      const sourceAccount = await sql`
        SELECT * FROM float_accounts WHERE id = ${sourceAccountId}
      `;

      if (sourceAccount.length === 0) {
        return NextResponse.json(
          { error: "Source account not found" },
          { status: 404 }
        );
      }

      const sourceAccountData = sourceAccount[0];
      const sourceBalance = Number(sourceAccountData.current_balance);

      if (sourceBalance < rechargeAmount) {
        return NextResponse.json(
          {
            error: `Insufficient balance in source account. Available: GHS ${sourceBalance.toFixed(
              2
            )}, Required: GHS ${rechargeAmount.toFixed(2)}`,
          },
          { status: 400 }
        );
      }

      // Deduct from source account
      const newSourceBalance = sourceBalance - rechargeAmount;
      await sql`
        UPDATE float_accounts 
        SET current_balance = ${newSourceBalance}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${sourceAccountId}
      `;

      // Record source account transaction (debit)
      await sql`
        INSERT INTO float_transactions (
          id, account_id, type, amount, balance_before, balance_after,
          description, created_by, branch_id, created_at, reference, recharge_method
        ) VALUES (
          gen_random_uuid(),
          ${sourceAccountId},
          'transfer_out',
          ${-rechargeAmount},
          ${sourceBalance},
          ${newSourceBalance},
          ${
            description ||
            `Transfer to ${currentTargetAccount.provider} account`
          },
          ${user.id},
          ${user.branchId},
          CURRENT_TIMESTAMP,
          ${reference || `TRANSFER-${Date.now()}`},
          ${rechargeMethod}
        )
      `;
    }

    // Add to target account
    const newBalance = currentBalance + rechargeAmount;
    await sql`
      UPDATE float_accounts 
      SET current_balance = ${newBalance}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${accountId}
    `;

    // Record target account transaction (credit)
    const transactionResult = await sql`
      INSERT INTO float_transactions (
        id, account_id, type, amount, balance_before, balance_after,
        description, created_by, branch_id, created_at, reference, recharge_method
      ) VALUES (
        gen_random_uuid(),
        ${accountId},
        'recharge',
        ${rechargeAmount},
        ${currentBalance},
        ${newBalance},
        ${description || `Float recharge of ${rechargeAmount}`},
        ${user.id},
        ${user.branchId},
        CURRENT_TIMESTAMP,
        ${reference || `RECHARGE-${Date.now()}`},
        ${rechargeMethod}
      )
      RETURNING *
    `;

    // Check if balance was low and send notification if it's now above threshold
    const threshold = currentTargetAccount.min_threshold || 5000;
    if (currentBalance < threshold && newBalance >= threshold) {
      try {
        await NotificationService.sendNotification({
          type: "system_alert",
          title: "Float Account Recharged",
          message: `Float account "${
            currentTargetAccount.provider
          }" has been recharged with GHS ${rechargeAmount}. New balance: GHS ${newBalance.toFixed(
            2
          )}`,
          userId: user.id,
          branchId: user.branchId,
          priority: "medium",
          metadata: {
            accountId,
            accountName: currentTargetAccount.provider,
            rechargeAmount,
            newBalance,
            previousBalance: currentBalance,
            sourceAccountId,
          },
        });
      } catch (notificationError) {
        console.error(
          "Failed to send recharge notification:",
          notificationError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account recharged successfully",
      transaction: {
        id: transactionResult[0].id,
        amount: rechargeAmount,
        newBalance,
        description: transactionResult[0].description,
        date: transactionResult[0].created_at,
        reference: transactionResult[0].reference,
      },
    });
  } catch (error) {
    console.error("Error recharging account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
