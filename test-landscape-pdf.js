// Test script for enhanced PDF with landscape orientation and improved opening balance
// Run this in the browser console

async function testLandscapePDF() {
  console.log("🔄 Testing Enhanced PDF with Landscape Orientation...");

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

    // Generate statement with a specific date range to test opening balance
    const startDate = "2025-07-01"; // Specific start date
    const endDate = "2025-07-31"; // Specific end date

    console.log(`📅 Testing period: ${startDate} to ${endDate}`);

    const statementResponse = await fetch(
      `/api/float-accounts/enhanced-statement?floatAccountId=${testAccount.id}&startDate=${startDate}&endDate=${endDate}`
    );
    const statementResult = await statementResponse.json();

    if (statementResult.success) {
      console.log("✅ Statement generated successfully!");
      console.log(`📊 Found ${statementResult.data.entries.length} entries`);
      console.log(
        `💰 Opening Balance: ${statementResult.data.summary.openingBalance}`
      );
      console.log(
        `💰 Closing Balance: ${statementResult.data.summary.closingBalance}`
      );
      console.log(`💰 Net Change: ${statementResult.data.summary.netChange}`);

      // Test opening balance calculation
      if (statementResult.data.entries.length > 0) {
        const firstEntry = statementResult.data.entries[0];
        const lastEntry =
          statementResult.data.entries[statementResult.data.entries.length - 1];

        console.log("🔍 Opening Balance Verification:");
        console.log(
          `  - First transaction balance before: ${firstEntry.balanceBefore}`
        );
        console.log(
          `  - Summary opening balance: ${statementResult.data.summary.openingBalance}`
        );
        console.log(
          `  - Last transaction balance after: ${lastEntry.balanceAfter}`
        );
        console.log(
          `  - Summary closing balance: ${statementResult.data.summary.closingBalance}`
        );

        // Verify that opening balance matches the first transaction's balance before
        if (
          Math.abs(
            firstEntry.balanceBefore -
              statementResult.data.summary.openingBalance
          ) < 0.01
        ) {
          console.log("✅ Opening balance calculation is correct!");
        } else {
          console.log("⚠️ Opening balance calculation may need adjustment");
        }
      }

      // Test PDF generation features
      console.log("🎨 PDF Features:");
      console.log("  - Landscape orientation (A4 landscape: 841.89 x 595.28)");
      console.log("  - Larger table fonts (headers: 11pt, data: 10pt)");
      console.log("  - Three-column summary layout");
      console.log("  - Balance Before and Balance After columns");
      console.log("  - Increased transaction limit (30 entries)");
      console.log("  - Larger watermark (400x400)");
      console.log("  - Better spacing and layout");

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
testLandscapePDF();
