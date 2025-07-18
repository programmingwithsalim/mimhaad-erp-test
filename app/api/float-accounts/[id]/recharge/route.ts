import { NextResponse, NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { neon } from "@neondatabase/serverless";
import { getDatabaseSession } from "@/lib/database-session-service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Convert to NextRequest for cookie access
    const nextRequest =
      request instanceof NextRequest
        ? request
        : new NextRequest(request.url, request);
    // 1. Session check
    const session = await getDatabaseSession(nextRequest);
    console.log("[RECHARGE] Session:", session);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: No session" },
        { status: 401 }
      );
    }
    const user = session.user;
    console.log("[RECHARGE] User:", user);

    // 2. Parse and validate body
    const { amount, sourceAccountId } = await request.json();
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!sourceAccountId) {
      return NextResponse.json(
        { error: "Source account required" },
        { status: 400 }
      );
    }

    // 3. Get target account
    const accountId = params.id;
    const [targetAccount] =
      await sql`SELECT * FROM float_accounts WHERE id = ${accountId}`;
    if (!targetAccount) {
      return NextResponse.json(
        { error: "Target account not found" },
        { status: 404 }
      );
    }
    console.log("[RECHARGE] Target account:", targetAccount);

    // 4. Permission check
    const isAdmin = user.role?.toLowerCase() === "admin";
    const isManager =
      user.role?.toLowerCase() === "manager" &&
      user.branchId === targetAccount.branch_id;
    const isFinance =
      user.role?.toLowerCase() === "finance" &&
      user.branchId === targetAccount.branch_id;
    if (!isAdmin && !isManager && !isFinance) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges" },
        { status: 403 }
      );
    }

    // 5. Get and check source account
    const [sourceAccount] =
      await sql`SELECT * FROM float_accounts WHERE id = ${sourceAccountId}`;
    if (!sourceAccount) {
      return NextResponse.json(
        { error: "Source account not found" },
        { status: 404 }
      );
    }
    if (!sourceAccount.is_active) {
      return NextResponse.json(
        { error: "Source account is not active" },
        { status: 400 }
      );
    }
    if (Number(sourceAccount.current_balance) < amount) {
      return NextResponse.json(
        { error: "Insufficient source account balance" },
        { status: 400 }
      );
    }

    // 6. Update balances
    const newSourceBalance = Number(sourceAccount.current_balance) - amount;
    const newTargetBalance = Number(targetAccount.current_balance) + amount;
    await sql`UPDATE float_accounts SET current_balance = ${newSourceBalance}, updated_at = NOW() WHERE id = ${sourceAccountId}`;
    await sql`UPDATE float_accounts SET current_balance = ${newTargetBalance}, updated_at = NOW() WHERE id = ${accountId}`;

    // 7. Record transactions (raw SQL with Neon client)
    const client = neon(process.env.DATABASE_URL!);
    const transferOutQuery = `
      INSERT INTO float_transactions (
        id, account_id, type, amount, balance_before, balance_after, description, created_by, branch_id, created_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        'transfer_out',
        ${-amount},
        ${Number(sourceAccount.current_balance)},
        ${newSourceBalance},
        $2,
        $3,
        $4,
        NOW()
      )
    `;
    await client.query(transferOutQuery, [
      sourceAccountId,
      `Transfer to ${targetAccount.provider}`,
      user.id,
      user.branchId,
    ]);

    const rechargeQuery = `
      INSERT INTO float_transactions (
        id, account_id, type, amount, balance_before, balance_after, description, created_by, branch_id, created_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        'recharge',
        ${amount},
        ${Number(targetAccount.current_balance)},
        ${newTargetBalance},
        $2,
        $3,
        $4,
        NOW()
      )
    `;
    await client.query(rechargeQuery, [
      accountId,
      `Recharge from ${sourceAccount.provider}`,
      user.id,
      user.branchId,
    ]);

    // 8. Success response
    return NextResponse.json({
      success: true,
      message: "Recharge successful",
      newTargetBalance,
    });
  } catch (error: any) {
    console.error("[RECHARGE] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
