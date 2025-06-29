import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { GLPostingServiceEnhanced } from "@/lib/services/gl-posting-service-enhanced";

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();

    // Get the original transaction
    const originalTx = await sql`
      SELECT * FROM momo_transactions WHERE id = ${id}
    `;

    if (originalTx.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const original = originalTx[0];
    const amountDiff = Number(updates.amount) - Number(original.amount);
    const feeDiff = Number(updates.fee || 0) - Number(original.fee || 0);

    // Update the transaction
    await sql`
      UPDATE momo_transactions 
      SET 
        customer_name = ${updates.customer_name || original.customer_name},
        phone_number = ${updates.phone_number || original.phone_number},
        amount = ${updates.amount || original.amount},
        fee = ${updates.fee || original.fee},
        reference = ${updates.reference || original.reference},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Update float account balance if amount changed
    if (amountDiff !== 0) {
      const floatAdjustment =
        original.type === "cash-in" ? -amountDiff : amountDiff;

      await sql`
        UPDATE float_accounts 
        SET current_balance = current_balance + ${floatAdjustment}
        WHERE id = ${original.float_account_id}
      `;
    }

    // Create GL reversal and new entries if amounts changed
    if (amountDiff !== 0 || feeDiff !== 0) {
      try {
        // Create reversal GL entry using the enhanced method
        await GLPostingServiceEnhanced.createMoMoGLEntries({
          transactionId: `${id}-reversal-${Date.now()}`,
          type: original.type === "cash-in" ? "cash-out" : "cash-in", // Reverse the original
          amount: Number(original.amount),
          fee: Number(original.fee || 0),
          provider: original.provider,
          phoneNumber: original.phone_number,
          customerName: original.customer_name,
          reference: `Reversal for edit: ${original.reference || id}`,
          processedBy: updates.updated_by || "system",
          branchId: original.branch_id,
          branchName: original.branch_name,
        });

        // Create new GL entry with updated amounts
        await GLPostingServiceEnhanced.createMoMoGLEntries({
          transactionId: `${id}-updated-${Date.now()}`,
          type: original.type,
          amount: Number(updates.amount),
          fee: Number(updates.fee || 0),
          provider: original.provider,
          phoneNumber: updates.phone_number || original.phone_number,
          customerName: updates.customer_name || original.customer_name,
          reference: updates.reference || original.reference,
          processedBy: updates.updated_by || "system",
          branchId: original.branch_id,
          branchName: original.branch_name,
        });
      } catch (glError) {
        console.warn(
          "GL posting failed, but transaction update succeeded:",
          glError
        );
        // Continue without failing the transaction update
      }
    }

    // Get updated transaction
    const updatedTx = await sql`
      SELECT * FROM momo_transactions WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      transaction: updatedTx[0],
    });
  } catch (error) {
    console.error("Error updating MoMo transaction:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update transaction",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the transaction to delete
    const transaction = await sql`
      SELECT * FROM momo_transactions WHERE id = ${id}
    `;

    if (transaction.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const tx = transaction[0];

    // Reverse the float account balance
    const floatAdjustment =
      tx.type === "cash-in" ? Number(tx.amount) : -Number(tx.amount);

    await sql`
      UPDATE float_accounts 
      SET current_balance = current_balance + ${floatAdjustment}
      WHERE id = ${tx.float_account_id}
    `;

    // Create reversal GL entry
    try {
      await GLPostingServiceEnhanced.createMoMoGLEntries({
        transactionId: `${id}-deletion-${Date.now()}`,
        type: tx.type === "cash-in" ? "cash-out" : "cash-in", // Reverse the original
        amount: Number(tx.amount),
        fee: Number(tx.fee || 0),
        provider: tx.provider,
        phoneNumber: tx.phone_number,
        customerName: tx.customer_name,
        reference: `Deletion reversal: ${tx.reference || id}`,
        processedBy: "system",
        branchId: tx.branch_id,
        branchName: tx.branch_name,
      });
    } catch (glError) {
      console.warn(
        "GL posting failed, but transaction deletion will proceed:",
        glError
      );
      // Continue without failing the transaction deletion
    }

    // Delete the transaction
    await sql`
      DELETE FROM momo_transactions WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: "Transaction deleted and float balance restored",
    });
  } catch (error) {
    console.error("Error deleting MoMo transaction:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
      },
      { status: 500 }
    );
  }
}
