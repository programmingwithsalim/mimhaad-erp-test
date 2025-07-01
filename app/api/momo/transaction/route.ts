"use server";

import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { GLPostingServiceEnhanced } from "@/lib/services/gl-posting-service-enhanced";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Normalize field names (handle both snake_case and camelCase)
    const normalizedData = {
      customer_name: body.customer_name || body.customerName,
      customer_phone:
        body.customer_phone || body.phoneNumber || body.phone_number,
      amount: Number(body.amount),
      fee: Number(body.fee || 0),
      provider: body.provider,
      type: body.type || body.transactionType,
      reference: body.reference,
      notes: body.notes || "",
    };

    // Validate required fields
    if (!normalizedData.customer_name) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!normalizedData.customer_phone) {
      return NextResponse.json(
        { success: false, error: "Customer phone number is required" },
        { status: 400 }
      );
    }

    if (!normalizedData.amount || normalizedData.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid amount is required" },
        { status: 400 }
      );
    }

    if (!normalizedData.provider) {
      return NextResponse.json(
        { success: false, error: "Provider is required" },
        { status: 400 }
      );
    }

    if (
      !normalizedData.type ||
      !["cash-in", "cash-out"].includes(normalizedData.type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid transaction type is required (cash-in or cash-out)",
        },
        { status: 400 }
      );
    }

    // Get user info from headers or session
    const branchId = request.headers.get("x-branch-id") || body.branchId;
    const userId = request.headers.get("x-user-id") || body.userId;

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required" },
        { status: 400 }
      );
    }

    // Find the appropriate float account
    const floatAccount = await sql`
      SELECT * FROM float_accounts 
      WHERE branch_id = ${branchId}
      AND provider = ${normalizedData.provider}
      AND account_type = 'momo'
      AND is_active = true
      LIMIT 1
    `;

    if (floatAccount.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No active MoMo float account found for provider: ${normalizedData.provider}`,
        },
        { status: 400 }
      );
    }

    const account = floatAccount[0];

    // Check if sufficient balance for cash-out
    if (
      normalizedData.type === "cash-out" &&
      account.current_balance < normalizedData.amount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient float balance for this transaction",
        },
        { status: 400 }
      );
    }

    // Calculate new balances for float and cash in till
    let newFloatBalance = Number(account.current_balance);
    let cashTillChange = 0;
    let floatChange = 0;

    if (normalizedData.type === "cash-in") {
      // Cash in: Increase cash in till, decrease MoMo float
      cashTillChange = normalizedData.amount + normalizedData.fee;
      floatChange = -normalizedData.amount;
      newFloatBalance = Number(account.current_balance) - normalizedData.amount;
    } else {
      // Cash out: Decrease cash in till, increase MoMo float
      cashTillChange = -(normalizedData.amount - normalizedData.fee);
      floatChange = normalizedData.amount;
      newFloatBalance = Number(account.current_balance) + normalizedData.amount;
    }

    // Create the transaction
    const transaction = await sql`
      INSERT INTO momo_transactions (
        branch_id,
        user_id,
        float_account_id,
        customer_name,
        phone_number,
        amount,
        fee,
        type,
        provider,
        reference,
        status,
        cash_till_affected,
        float_affected
      ) VALUES (
        ${branchId},
        ${userId || "system"},
        ${account.id},
        ${normalizedData.customer_name},
        ${normalizedData.customer_phone},
        ${normalizedData.amount},
        ${normalizedData.fee},
        ${normalizedData.type},
        ${normalizedData.provider},
        ${normalizedData.reference || `MOMO-${Date.now()}`},
        'completed',
        ${cashTillChange},
        ${floatChange}
      )
      RETURNING *
    `;

    // Update float account balance (MoMo float)
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = ${newFloatBalance},
        updated_at = NOW()
      WHERE id = ${account.id}
    `;

    // Update cash in till
    await sql`
      UPDATE float_accounts 
      SET 
        current_balance = current_balance + ${cashTillChange},
        updated_at = NOW()
      WHERE branch_id = ${branchId}
      AND account_type = 'cash-in-till'
      AND is_active = true
    `;

    // Create GL entries
    try {
      await GLPostingServiceEnhanced.createMoMoGLEntries({
        transactionId: transaction[0].id,
        type: normalizedData.type,
        amount: normalizedData.amount,
        fee: normalizedData.fee,
        provider: normalizedData.provider,
        phoneNumber: normalizedData.customer_phone,
        customerName: normalizedData.customer_name,
        reference: transaction[0].reference,
        processedBy: userId || "system",
        branchId: branchId,
        branchName: "Branch", // You might want to fetch actual branch name
      });
    } catch (glError) {
      console.warn("GL posting failed, but transaction succeeded:", glError);
      // Continue without failing the transaction
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction[0].id,
        customerName: transaction[0].customer_name,
        phoneNumber: transaction[0].phone_number,
        amount: transaction[0].amount,
        fee: transaction[0].fee,
        type: transaction[0].type,
        provider: transaction[0].provider,
        reference: transaction[0].reference,
        status: transaction[0].status,
        date: transaction[0].created_at,
        branchName: "Branch",
      },
      message: "MoMo transaction processed successfully",
    });
  } catch (error) {
    console.error("Error processing MoMo transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process transaction",
      },
      { status: 500 }
    );
  }
}
