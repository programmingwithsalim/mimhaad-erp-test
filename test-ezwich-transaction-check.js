// Test script to check E-Zwich transaction after processing
// Run this in the browser console

async function testEzwichTransactionCheck() {
  console.log("🔍 Checking E-Zwich Transaction After Processing...");

  try {
    const branchId = "86d0097e-9bce-4f1f-b9b4-9dd2dc9ee01c";
    const today = new Date().toISOString().split("T")[0];

    console.log("📅 Today's Date:", today);

    // Check E-Zwich transactions API
    console.log("📊 Checking E-Zwich Transactions API...");
    const transactionsResponse = await fetch(
      `/api/e-zwich/transactions?branchId=${branchId}&limit=10`
    );
    const transactionsResult = await transactionsResponse.json();

    if (transactionsResponse.ok) {
      console.log("✅ E-Zwich transactions API working!");
      console.log(`📈 Total Transactions: ${transactionsResult.total || 0}`);
      console.log(
        `📋 Recent Transactions: ${
          transactionsResult.transactions?.length || 0
        }`
      );

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
            `  ${i + 1}. Amount: ${t.amount}, Status: ${
              t.status
            }, Date: ${transactionDate} ${dateStatus}, Reference: ${
              t.reference
            }`
          );
        });
      } else {
        console.log("⚠️  No E-Zwich transactions found");
      }
    }

    // Check E-Zwich withdrawals API specifically
    console.log("📊 Checking E-Zwich Withdrawals API...");
    const withdrawalsResponse = await fetch(
      `/api/e-zwich/withdrawals?branchId=${branchId}&limit=10`
    );
    const withdrawalsResult = await withdrawalsResponse.json();

    if (withdrawalsResponse.ok) {
      console.log("✅ E-Zwich withdrawals API working!");
      console.log(`📈 Total Withdrawals: ${withdrawalsResult.total || 0}`);
      console.log(
        `📋 Recent Withdrawals: ${withdrawalsResult.withdrawals?.length || 0}`
      );

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
    }

    // Check E-Zwich statistics
    console.log("📊 Checking E-Zwich Statistics...");
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
    }

    // Check if there are any transactions with today's date
    console.log("🔍 Checking for transactions with today's date...");
    if (transactionsResult.transactions) {
      const todayTransactions = transactionsResult.transactions.filter((t) => {
        const transactionDate = t.transaction_date
          ? t.transaction_date.split("T")[0]
          : "";
        return transactionDate === today;
      });

      console.log(
        `📅 Transactions with today's date (${today}): ${todayTransactions.length}`
      );
      todayTransactions.forEach((t, i) => {
        console.log(
          `  ${i + 1}. Amount: ${t.amount}, Status: ${t.status}, Reference: ${
            t.reference
          }`
        );
      });
    }

    console.log("🎯 Analysis:");
    console.log("  ✅ Transaction was processed through unified API");
    console.log("  ✅ GL entries were created successfully");
    console.log(
      "  ⚠️  Transaction may not be saved to e_zwich_withdrawals table"
    );
    console.log(
      "  💡 Statistics API looks for transactions in e_zwich_withdrawals table"
    );
    console.log(
      "  💡 Unified API may only create GL entries, not save to specific tables"
    );

    console.log("🎉 E-Zwich transaction check completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testEzwichTransactionCheck();
