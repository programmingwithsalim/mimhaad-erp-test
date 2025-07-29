// Comprehensive debug script for E-Zwich statistics
// Run this in the browser console

async function testEzwichDebug() {
  console.log("🔍 Comprehensive E-Zwich Debug...");

  try {
    const branchId = "86d0097e-9bce-4f1f-b9b4-9dd2dc9ee01c";
    const today = new Date().toISOString().split("T")[0];

    console.log("📅 Today's Date:", today);
    console.log("🏢 Branch ID:", branchId);

    // 1. Check E-Zwich statistics API directly
    console.log("📊 1. Testing E-Zwich Statistics API...");
    const statsResponse = await fetch(
      `/api/e-zwich/statistics?branchId=${branchId}`
    );
    const statsResult = await statsResponse.json();

    if (statsResponse.ok && statsResult.success) {
      console.log("✅ E-Zwich statistics API working!");
      const stats = statsResult.data;
      console.log("📈 Current Statistics:");
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
      console.log("❌ E-Zwich statistics API failed:", statsResult.error);
    }

    // 2. Check E-Zwich transactions API
    console.log("📊 2. Testing E-Zwich Transactions API...");
    const transactionsResponse = await fetch(
      `/api/e-zwich/transactions?branchId=${branchId}&limit=10`
    );
    const transactionsResult = await transactionsResponse.json();

    if (transactionsResponse.ok) {
      console.log("✅ E-Zwich transactions API working!");
      console.log(`📈 Total Transactions: ${transactionsResult.total || 0}`);

      if (
        transactionsResult.transactions &&
        transactionsResult.transactions.length > 0
      ) {
        console.log("📋 Recent E-Zwich Transactions:");
        transactionsResult.transactions.forEach((t, i) => {
          const transactionDate = t.transaction_date
            ? t.transaction_date.split("T")[0]
            : "No date";
          const isToday = transactionDate === today;
          const dateStatus = isToday ? "✅ TODAY" : "📅 OTHER";
          console.log(
            `  ${i + 1}. Amount: ${t.amount}, Status: ${t.status}, Type: ${
              t.type
            }, Date: ${transactionDate} ${dateStatus}, Reference: ${
              t.reference
            }`
          );
        });
      } else {
        console.log("⚠️  No E-Zwich transactions found");
      }
    } else {
      console.log(
        "❌ E-Zwich transactions API failed:",
        transactionsResult.error
      );
    }

    // 3. Check E-Zwich withdrawals API specifically
    console.log("📊 3. Testing E-Zwich Withdrawals API...");
    const withdrawalsResponse = await fetch(
      `/api/e-zwich/withdrawals?branchId=${branchId}&limit=10`
    );
    const withdrawalsResult = await withdrawalsResponse.json();

    if (withdrawalsResponse.ok) {
      console.log("✅ E-Zwich withdrawals API working!");
      console.log(`📈 Total Withdrawals: ${withdrawalsResult.total || 0}`);

      if (
        withdrawalsResult.withdrawals &&
        withdrawalsResult.withdrawals.length > 0
      ) {
        console.log("📋 Recent E-Zwich Withdrawals:");
        withdrawalsResult.withdrawals.forEach((w, i) => {
          const withdrawalDate = w.transaction_date
            ? w.transaction_date.split("T")[0]
            : "No date";
          const isToday = withdrawalDate === today;
          const dateStatus = isToday ? "✅ TODAY" : "📅 OTHER";
          console.log(
            `  ${i + 1}. Amount: ${w.amount}, Status: ${
              w.status
            }, Date: ${withdrawalDate} ${dateStatus}, Reference: ${w.reference}`
          );
        });
      } else {
        console.log("⚠️  No E-Zwich withdrawals found");
      }
    } else {
      console.log(
        "❌ E-Zwich withdrawals API failed:",
        withdrawalsResult.error
      );
    }

    // 4. Check E-Zwich card issuances API
    console.log("📊 4. Testing E-Zwich Card Issuances API...");
    const issuancesResponse = await fetch(
      `/api/e-zwich/cards?branchId=${branchId}&limit=10`
    );
    const issuancesResult = await issuancesResponse.json();

    if (issuancesResponse.ok) {
      console.log("✅ E-Zwich card issuances API working!");
      console.log(`📈 Total Issuances: ${issuancesResult.total || 0}`);

      if (issuancesResult.cards && issuancesResult.cards.length > 0) {
        console.log("📋 Recent E-Zwich Card Issuances:");
        issuancesResult.cards.forEach((c, i) => {
          const issuanceDate = c.created_at
            ? c.created_at.split("T")[0]
            : "No date";
          const isToday = issuanceDate === today;
          const dateStatus = isToday ? "✅ TODAY" : "📅 OTHER";
          console.log(
            `  ${i + 1}. Fee: ${c.fee_charged}, Status: ${
              c.status
            }, Date: ${issuanceDate} ${dateStatus}`
          );
        });
      } else {
        console.log("⚠️  No E-Zwich card issuances found");
      }
    } else {
      console.log(
        "❌ E-Zwich card issuances API failed:",
        issuancesResult.error
      );
    }

    // 5. Check Jumia statistics
    console.log("📊 5. Testing Jumia Statistics API...");
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
    } else {
      console.log("❌ Jumia statistics API failed:", jumiaResult.error);
    }

    // 6. Check dashboard statistics
    console.log("📊 6. Testing Dashboard Statistics API...");
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

    console.log("🎯 Analysis:");
    console.log("  🔍 Checking if transactions exist in database");
    console.log("  🔍 Checking if status filtering is working");
    console.log("  🔍 Checking if date filtering is working");
    console.log("  🔍 Checking if table/column names are correct");

    console.log("🎉 E-Zwich debug completed!");
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

// Run the debug
testEzwichDebug();
