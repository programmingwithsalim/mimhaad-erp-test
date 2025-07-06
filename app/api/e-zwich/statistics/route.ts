import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Branch ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching E-Zwich statistics for branch:", branchId);

    const today = new Date().toISOString().split("T")[0];

    // Get today's statistics from both withdrawals and card issuances
    const [todayWithdrawals, todayIssuances] = await Promise.all([
      sql`
        SELECT 
          COUNT(*) as today_withdrawals,
          COALESCE(SUM(amount), 0) as today_withdrawal_volume,
          COALESCE(SUM(fee), 0) as today_withdrawal_fees
        FROM e_zwich_withdrawals 
        WHERE branch_id = ${branchId}
        AND DATE(created_at) = ${today}
        AND status = 'completed'
        AND (is_reversal IS NULL OR is_reversal = false)
      `,
      sql`
        SELECT 
          COUNT(*) as today_issuances,
          COALESCE(SUM(fee_charged), 0) as today_issuance_fees
        FROM ezwich_card_issuance 
        WHERE branch_id = ${branchId}
        AND DATE(created_at) = ${today}
      `,
    ]);

    // Get total statistics from both withdrawals and card issuances
    const [totalWithdrawals, totalIssuances] = await Promise.all([
      sql`
        SELECT 
          COUNT(*) as total_withdrawals,
          COALESCE(SUM(amount), 0) as total_withdrawal_volume,
          COALESCE(SUM(fee), 0) as total_withdrawal_fees
        FROM e_zwich_withdrawals 
        WHERE branch_id = ${branchId}
        AND status = 'completed'
        AND (is_reversal IS NULL OR is_reversal = false)
      `,
      sql`
        SELECT 
          COUNT(*) as total_issuances,
          COALESCE(SUM(fee_charged), 0) as total_issuance_fees
        FROM ezwich_card_issuance 
        WHERE branch_id = ${branchId}
      `,
    ]);

    // Get active providers count (E-Zwich partners)
    const providerStats = await sql`
      SELECT COUNT(*) as active_providers
      FROM float_accounts 
      WHERE branch_id = ${branchId}
      AND is_active = true
      AND (isezwichpartner = true OR account_type = 'e-zwich')
    `;

    // Get float balance from E-Zwich partner accounts
    const floatStats = await sql`
      SELECT COALESCE(SUM(current_balance), 0) as float_balance
      FROM float_accounts 
      WHERE branch_id = ${branchId}
      AND is_active = true
      AND (isezwichpartner = true OR account_type = 'e-zwich')
    `;

    // Calculate totals
    const todayTransactions =
      Number(todayWithdrawals[0]?.today_withdrawals || 0) +
      Number(todayIssuances[0]?.today_issuances || 0);
    const totalTransactions =
      Number(totalWithdrawals[0]?.total_withdrawals || 0) +
      Number(totalIssuances[0]?.total_issuances || 0);
    const todayVolume = Number(
      todayWithdrawals[0]?.today_withdrawal_volume || 0
    );
    const totalVolume = Number(
      totalWithdrawals[0]?.total_withdrawal_volume || 0
    );
    const todayCommission =
      Number(todayWithdrawals[0]?.today_withdrawal_fees || 0) +
      Number(todayIssuances[0]?.today_issuance_fees || 0);
    const totalCommission =
      Number(totalWithdrawals[0]?.total_withdrawal_fees || 0) +
      Number(totalIssuances[0]?.total_issuance_fees || 0);

    const statistics = {
      todayTransactions,
      totalTransactions,
      todayVolume,
      totalVolume,
      todayCommission,
      totalCommission,
      activeProviders: Number(providerStats[0]?.active_providers || 0),
      floatBalance: Number(floatStats[0]?.float_balance || 0),
      lowFloatAlerts: 0, // Will be calculated from float accounts
    };

    console.log("E-Zwich statistics:", statistics);

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Error fetching E-Zwich statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch E-Zwich statistics",
        data: {
          todayTransactions: 0,
          totalTransactions: 0,
          todayVolume: 0,
          totalVolume: 0,
          todayCommission: 0,
          totalCommission: 0,
          activeProviders: 0,
          floatBalance: 0,
          lowFloatAlerts: 0,
        },
      },
      { status: 500 }
    );
  }
}
