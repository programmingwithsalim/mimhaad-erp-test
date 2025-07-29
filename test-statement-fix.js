// Quick test to verify statement generation fix
// Run this in the browser console

async function testStatementFix() {
  console.log("🧪 Testing Statement Generation Fix...");

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

    // Generate statement
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

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
    } else {
      console.log("❌ Statement generation failed:", statementResult.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testStatementFix();
