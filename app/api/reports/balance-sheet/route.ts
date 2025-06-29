import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];
    const branch = searchParams.get("branch") || "all";

    console.log("🔄 Fetching balance sheet data:", { date, branch });

    // Assets calculation
    const assetsData = await sql`
      SELECT 
        -- Current Assets
        COALESCE(SUM(CASE WHEN account_type IN ('cash-in-till', 'momo', 'agency-banking') THEN current_balance ELSE 0 END), 0) as cash_and_cash_equivalents,
        COALESCE(SUM(CASE WHEN account_type = 'receivables' THEN current_balance ELSE 0 END), 0) as accounts_receivable,
        COALESCE(SUM(CASE WHEN account_type = 'inventory' THEN current_balance ELSE 0 END), 0) as inventory,
        COALESCE(SUM(CASE WHEN account_type = 'prepaid' THEN current_balance ELSE 0 END), 0) as prepaid_expenses,
        COALESCE(SUM(CASE WHEN account_type = 'short_term_investments' THEN current_balance ELSE 0 END), 0) as short_term_investments,
        
        -- Non-Current Assets
        COALESCE(SUM(CASE WHEN account_type = 'property' THEN current_balance ELSE 0 END), 0) as property_plant_equipment,
        COALESCE(SUM(CASE WHEN account_type = 'intangible' THEN current_balance ELSE 0 END), 0) as intangible_assets,
        COALESCE(SUM(CASE WHEN account_type = 'long_term_investments' THEN current_balance ELSE 0 END), 0) as long_term_investments,
        COALESCE(SUM(CASE WHEN account_type = 'goodwill' THEN current_balance ELSE 0 END), 0) as goodwill
      FROM float_accounts 
      WHERE is_active = true
      ${branch !== "all" ? sql`AND branch_id = ${branch}` : sql``}
    `;

    // Liabilities calculation
    const liabilitiesData = await sql`
      SELECT 
        -- Current Liabilities
        COALESCE(SUM(CASE WHEN account_type = 'accounts_payable' THEN current_balance ELSE 0 END), 0) as accounts_payable,
        COALESCE(SUM(CASE WHEN account_type = 'short_term_debt' THEN current_balance ELSE 0 END), 0) as short_term_debt,
        COALESCE(SUM(CASE WHEN account_type = 'accrued_liabilities' THEN current_balance ELSE 0 END), 0) as accrued_liabilities,
        COALESCE(SUM(CASE WHEN account_type = 'current_portion_long_term_debt' THEN current_balance ELSE 0 END), 0) as current_portion_long_term_debt,
        COALESCE(SUM(CASE WHEN account_type = 'taxes_payable' THEN current_balance ELSE 0 END), 0) as taxes_payable,
        
        -- Non-Current Liabilities
        COALESCE(SUM(CASE WHEN account_type = 'long_term_debt' THEN current_balance ELSE 0 END), 0) as long_term_debt,
        COALESCE(SUM(CASE WHEN account_type = 'deferred_tax' THEN current_balance ELSE 0 END), 0) as deferred_tax_liabilities,
        COALESCE(SUM(CASE WHEN account_type = 'pension_obligations' THEN current_balance ELSE 0 END), 0) as pension_obligations
      FROM float_accounts 
      WHERE is_active = true
      AND account_type LIKE '%liability%' OR account_type LIKE '%payable%' OR account_type LIKE '%debt%'
      ${branch !== "all" ? sql`AND branch_id = ${branch}` : sql``}
    `;

    // Equity calculation (simplified)
    const equityData = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN account_type = 'capital' THEN current_balance ELSE 0 END), 1000000) as capital_stock,
        COALESCE(SUM(CASE WHEN account_type = 'retained_earnings' THEN current_balance ELSE 0 END), 0) as retained_earnings,
        COALESCE(SUM(CASE WHEN account_type = 'other_comprehensive_income' THEN current_balance ELSE 0 END), 0) as accumulated_other_comprehensive_income
      FROM float_accounts 
      WHERE is_active = true
      AND account_type LIKE '%equity%' OR account_type LIKE '%capital%' OR account_type LIKE '%retained%'
      ${branch !== "all" ? sql`AND branch_id = ${branch}` : sql``}
    `;

    const assets = assetsData[0] || {};
    const liabilities = liabilitiesData[0] || {};
    const equity = equityData[0] || {};

    // Calculate totals and subtotals
    const currentAssets = {
      cashAndCashEquivalents: Number(assets.cash_and_cash_equivalents || 0),
      accountsReceivable: Number(assets.accounts_receivable || 0),
      inventory: Number(assets.inventory || 0),
      prepaidExpenses: Number(assets.prepaid_expenses || 0),
      shortTermInvestments: Number(assets.short_term_investments || 0),
    };
    currentAssets.totalCurrent = Object.values(currentAssets).reduce(
      (sum, val) => sum + val,
      0
    );

    const nonCurrentAssets = {
      propertyPlantEquipment: Number(assets.property_plant_equipment || 0),
      accumulatedDepreciation:
        -Number(assets.property_plant_equipment || 0) * 0.1, // Simplified depreciation
      netPropertyPlantEquipment:
        Number(assets.property_plant_equipment || 0) * 0.9,
      intangibleAssets: Number(assets.intangible_assets || 0),
      longTermInvestments: Number(assets.long_term_investments || 0),
      goodwill: Number(assets.goodwill || 0),
    };
    nonCurrentAssets.totalNonCurrent =
      nonCurrentAssets.netPropertyPlantEquipment +
      nonCurrentAssets.intangibleAssets +
      nonCurrentAssets.longTermInvestments +
      nonCurrentAssets.goodwill;

    const currentLiabilities = {
      accountsPayable: Number(liabilities.accounts_payable || 0),
      shortTermDebt: Number(liabilities.short_term_debt || 0),
      accruedLiabilities: Number(liabilities.accrued_liabilities || 0),
      currentPortionLongTermDebt: Number(
        liabilities.current_portion_long_term_debt || 0
      ),
      taxesPayable: Number(liabilities.taxes_payable || 0),
    };
    currentLiabilities.totalCurrent = Object.values(currentLiabilities).reduce(
      (sum, val) => sum + val,
      0
    );

    const nonCurrentLiabilities = {
      longTermDebt: Number(liabilities.long_term_debt || 0),
      deferredTaxLiabilities: Number(liabilities.deferred_tax_liabilities || 0),
      pensionObligations: Number(liabilities.pension_obligations || 0),
    };
    nonCurrentLiabilities.totalNonCurrent = Object.values(
      nonCurrentLiabilities
    ).reduce((sum, val) => sum + val, 0);

    const equityData_final = {
      capitalStock: Number(equity.capital_stock || 1000000),
      retainedEarnings: Number(equity.retained_earnings || 0),
      accumulatedOtherComprehensiveIncome: Number(
        equity.accumulated_other_comprehensive_income || 0
      ),
    };
    equityData_final.totalEquity = Object.values(equityData_final).reduce(
      (sum, val) => sum + val,
      0
    );

    const balanceSheetData = {
      assets: {
        current: currentAssets,
        nonCurrent: nonCurrentAssets,
        totalAssets:
          currentAssets.totalCurrent + nonCurrentAssets.totalNonCurrent,
      },
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        totalLiabilities:
          currentLiabilities.totalCurrent +
          nonCurrentLiabilities.totalNonCurrent,
      },
      equity: equityData_final,
    };

    console.log("✅ Balance sheet data fetched successfully");

    return NextResponse.json({
      success: true,
      data: balanceSheetData,
    });
  } catch (error) {
    console.error("❌ Error fetching balance sheet:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch balance sheet data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
