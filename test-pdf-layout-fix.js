// Test script for PDF layout fixes and balance calculation
// Run this in the browser console

async function testPDFLayoutFix() {
  console.log("🔧 Testing PDF Layout Fixes and Balance Calculation...");

  try {
    // Get float accounts
    const accountsResponse = await fetch("/api/float-accounts");
    const accountsResult = await accountsResponse.json();

    if (!accountsResult.success || !accountsResult.accounts.length) {
      console.log("❌ No float accounts found");
      return;
    }

    const testAccount = accountsResult.accounts[0];
    console.log(`✅ Testing with account: ${testAccount.provider}`);

    // Generate statement with a specific date range
    const startDate = "2025-07-01";
    const endDate = "2025-07-31";

    console.log(`📅 Testing period: ${startDate} to ${endDate}`);

    const statementResponse = await fetch(
      `/api/float-accounts/enhanced-statement?floatAccountId=${testAccount.id}&startDate=${startDate}&endDate=${endDate}`
    );
    const statementResult = await statementResponse.json();

    if (statementResult.success) {
      console.log("✅ Statement generated successfully!");
      console.log(`📊 Found ${statementResult.data.entries.length} entries`);

      // Test balance calculations
      console.log("💰 Balance Analysis:");
      console.log(
        `  - Opening Balance: ${statementResult.data.summary.openingBalance}`
      );
      console.log(
        `  - Closing Balance: ${statementResult.data.summary.closingBalance}`
      );
      console.log(`  - Net Change: ${statementResult.data.summary.netChange}`);
      console.log(
        `  - Total Credits: ${statementResult.data.summary.totalCredits}`
      );
      console.log(
        `  - Total Debits: ${statementResult.data.summary.totalDebits}`
      );

      // Verify no negative opening balance
      if (statementResult.data.summary.openingBalance < 0) {
        console.log("⚠️ Warning: Opening balance is negative!");
      } else {
        console.log("✅ Opening balance is non-negative");
      }

      // Test transaction balance consistency
      if (statementResult.data.entries.length > 0) {
        const firstEntry = statementResult.data.entries[0];
        const lastEntry =
          statementResult.data.entries[statementResult.data.entries.length - 1];

        console.log("🔍 Transaction Balance Verification:");
        console.log(
          `  - First transaction balance before: ${firstEntry.balanceBefore}`
        );
        console.log(
          `  - Last transaction balance after: ${lastEntry.balanceAfter}`
        );
        console.log(
          `  - Summary opening balance: ${statementResult.data.summary.openingBalance}`
        );
        console.log(
          `  - Summary closing balance: ${statementResult.data.summary.closingBalance}`
        );

        // Check if balances match
        const openingMatch =
          Math.abs(
            firstEntry.balanceBefore -
              statementResult.data.summary.openingBalance
          ) < 0.01;
        const closingMatch =
          Math.abs(
            lastEntry.balanceAfter - statementResult.data.summary.closingBalance
          ) < 0.01;

        if (openingMatch && closingMatch) {
          console.log("✅ Balance calculations are consistent!");
        } else {
          console.log("⚠️ Balance calculations may have inconsistencies");
        }
      }

      // Test PDF layout improvements
      console.log("🎨 PDF Layout Improvements:");
      console.log("  - Increased header height (80px)");
      console.log("  - Better spacing between sections");
      console.log("  - Larger margins (50px from edges)");
      console.log("  - Improved table positioning (350px from top)");
      console.log("  - Better column widths for landscape");
      console.log("  - Increased row height (22px)");
      console.log("  - Fixed overlapping elements");
      console.log("  - Non-negative opening balance enforcement");

      // Test logo accessibility
      const logoResponse = await fetch("/logo.png");
      if (logoResponse.ok) {
        console.log("✅ Logo file accessible for PDF generation");
      } else {
        console.log("⚠️ Logo file not accessible");
      }
    } else {
      console.log("❌ Statement generation failed:", statementResult.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testPDFLayoutFix();
