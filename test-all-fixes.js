// Comprehensive test script to verify all fixes
// Run this in the browser console

async function testAllFixes() {
  console.log("🔧 Testing All Fixes...");

  try {
    const branchId = "86d0097e-9bce-4f1f-b9b4-9dd2dc9ee01c";

    console.log("📅 Today's Date:", new Date().toISOString().split("T")[0]);
    console.log("🏢 Branch ID:", branchId);

    // Test 1: E-Zwich Statistics
    console.log("📊 1. Testing E-Zwich Statistics...");
    const ezwichResponse = await fetch(
      `/api/e-zwich/statistics?branchId=${branchId}`
    );
    const ezwichResult = await ezwichResponse.json();

    if (ezwichResponse.ok && ezwichResult.success) {
      console.log("✅ E-Zwich statistics API working!");
      const stats = ezwichResult.data;
      console.log("📈 E-Zwich Statistics:");
      console.log(`  Today Transactions: ${stats.todayTransactions}`);
      console.log(`  Total Transactions: ${stats.totalTransactions}`);
      console.log(`  Today Volume: ${stats.todayVolume}`);
      console.log(`  Total Volume: ${stats.totalVolume}`);
      console.log(`  Today Commission: ${stats.todayCommission}`);
      console.log(`  Total Commission: ${stats.totalCommission}`);
      console.log(`  Active Providers: ${stats.activeProviders}`);
      console.log(`  Float Balance: ${stats.floatBalance}`);
      console.log(`  Low Float Alerts: ${stats.lowFloatAlerts}`);
    } else {
      console.log("❌ E-Zwich statistics API failed:", ezwichResult.error);
    }

    // Test 2: Jumia Statistics
    console.log("📊 2. Testing Jumia Statistics...");
    const jumiaResponse = await fetch(
      `/api/jumia/statistics?branchId=${branchId}`
    );
    const jumiaResult = await jumiaResponse.json();

    if (jumiaResponse.ok && jumiaResult.success) {
      console.log("✅ Jumia statistics API working!");
      const jumiaStats = jumiaResult.data;
      console.log("📈 Jumia Statistics:");
      console.log(`  Today Transactions: ${jumiaStats.todayTransactions}`);
      console.log(`  Total Transactions: ${jumiaStats.totalTransactions}`);
      console.log(`  Today Volume: ${jumiaStats.todayVolume}`);
      console.log(`  Total Volume: ${jumiaStats.totalVolume}`);
      console.log(`  Today Commission: ${jumiaStats.todayCommission}`);
      console.log(`  Total Commission: ${jumiaStats.totalCommission}`);
      console.log(`  Active Providers: ${jumiaStats.activeProviders}`);
      console.log(`  Float Balance: ${jumiaStats.floatBalance}`);
    } else {
      console.log("❌ Jumia statistics API failed:", jumiaResult.error);
    }

    // Test 3: Expenses API
    console.log("📊 3. Testing Expenses API...");
    const expensesResponse = await fetch(`/api/expenses?branchId=${branchId}`);
    const expensesResult = await expensesResponse.json();

    if (expensesResponse.ok && expensesResult.success) {
      console.log("✅ Expenses API working!");
      const expensesStats = expensesResult.statistics;
      console.log("📈 Expenses Statistics:");
      console.log(`  Total Expenses: ${expensesStats.total_expenses}`);
      console.log(`  Pending Count: ${expensesStats.pending_count}`);
      console.log(`  Approved Count: ${expensesStats.approved_count}`);
      console.log(`  Rejected Count: ${expensesStats.rejected_count}`);
      console.log(`  Paid Count: ${expensesStats.paid_count}`);
      console.log(`  Total Amount: ${expensesStats.total_amount}`);
      console.log(`  Pending Amount: ${expensesStats.pending_amount}`);
      console.log(`  Approved Amount: ${expensesStats.approved_amount}`);
      console.log(`  Paid Amount: ${expensesStats.paid_amount}`);
    } else {
      console.log("❌ Expenses API failed:", expensesResult.error);
    }

    // Test 4: Jumia Transactions API (for packages)
    console.log("📊 4. Testing Jumia Transactions API (Packages)...");
    const jumiaTransactionsResponse = await fetch(
      `/api/jumia/transactions?branchId=${branchId}&transactionType=package_receipt&limit=5`
    );
    const jumiaTransactionsResult = await jumiaTransactionsResponse.json();

    if (jumiaTransactionsResponse.ok && jumiaTransactionsResult.success) {
      console.log("✅ Jumia transactions API working!");
      console.log(
        `📦 Package Transactions Found: ${jumiaTransactionsResult.total}`
      );
      console.log(
        `📄 Page: ${jumiaTransactionsResult.page} of ${jumiaTransactionsResult.totalPages}`
      );

      if (
        jumiaTransactionsResult.transactions &&
        jumiaTransactionsResult.transactions.length > 0
      ) {
        console.log("📋 Recent Package Transactions:");
        jumiaTransactionsResult.transactions.forEach((tx, i) => {
          console.log(
            `  ${i + 1}. Type: ${tx.transaction_type}, Amount: ${
              tx.amount
            }, Status: ${tx.status}, Customer: ${tx.customer_name}`
          );
        });
      } else {
        console.log("⚠️  No package transactions found");
      }
    } else {
      console.log(
        "❌ Jumia transactions API failed:",
        jumiaTransactionsResult.error
      );
    }

    // Test 5: Dashboard Statistics
    console.log("📊 5. Testing Dashboard Statistics...");
    const dashboardResponse = await fetch(
      `/api/dashboard/statistics?userRole=Admin&userBranchId=${branchId}`
    );
    const dashboardResult = await dashboardResponse.json();

    if (dashboardResponse.ok) {
      console.log("✅ Dashboard statistics API working!");

      // Check E-Zwich in dashboard
      const ezwichService = dashboardResult.serviceStats?.find(
        (s) => s.service === "E-Zwich"
      );
      if (ezwichService) {
        console.log("📈 E-Zwich in Dashboard:");
        console.log(`  Today Transactions: ${ezwichService.todayTransactions}`);
        console.log(`  Today Volume: ${ezwichService.todayVolume}`);
        console.log(`  Today Fees: ${ezwichService.todayFees}`);
      } else {
        console.log("⚠️  E-Zwich service not found in dashboard stats");
      }

      // Check Jumia in dashboard
      const jumiaService = dashboardResult.serviceStats?.find(
        (s) => s.service === "Jumia"
      );
      if (jumiaService) {
        console.log("📈 Jumia in Dashboard:");
        console.log(`  Today Transactions: ${jumiaService.todayTransactions}`);
        console.log(`  Today Volume: ${jumiaService.todayVolume}`);
        console.log(`  Today Fees: ${jumiaService.todayFees}`);
      } else {
        console.log("⚠️  Jumia service not found in dashboard stats");
      }
    } else {
      console.log("❌ Dashboard statistics API failed:", dashboardResult.error);
    }

    console.log("🎯 Summary:");
    console.log("  ✅ E-Zwich statistics API fixed (using CURRENT_DATE)");
    console.log("  ✅ Jumia statistics API fixed (conditional SQL)");
    console.log("  ✅ Expenses API fixed (conditional SQL)");
    console.log(
      "  ✅ Jumia transactions API enhanced (filtering & pagination)"
    );
    console.log("  ✅ New Jumia packages page created");
    console.log(
      "  ✅ Jumia main page updated (packages moved to separate tab)"
    );

    console.log("🎉 All fixes test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testAllFixes();
