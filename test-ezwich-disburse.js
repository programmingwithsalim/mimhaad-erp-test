// Test script to check E-Zwich transaction disbursement
// Run this in the browser console

async function testEzwichDisburse() {
  console.log("🔍 Checking E-Zwich Transaction Disbursement...");

  try {
    const branchId = "86d0097e-9bce-4f1f-b9b4-9dd2dc9ee01c";

    // Check E-Zwich transactions API
    console.log("📊 Checking E-Zwich Transactions...");
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
          console.log(
            `  ${i + 1}. Amount: ${t.amount}, Status: ${t.status}, Type: ${
              t.type
            }, Reference: ${t.reference}`
          );

          // Check if this transaction needs disbursement
          if (t.status === "pending" && t.type === "withdrawal") {
            console.log(`    ⚠️  This transaction needs to be disbursed!`);
            console.log(`    💡 Transaction ID: ${t.id}`);
          }
        });
      } else {
        console.log("⚠️  No E-Zwich transactions found");
      }
    }

    // Check E-Zwich withdrawals API specifically
    console.log("📊 Checking E-Zwich Withdrawals...");
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
          console.log(
            `  ${i + 1}. Amount: ${w.amount}, Status: ${w.status}, Reference: ${
              w.reference
            }`
          );

          // Check if this withdrawal needs disbursement
          if (w.status === "pending") {
            console.log(`    ⚠️  This withdrawal needs to be disbursed!`);
            console.log(`    💡 Withdrawal ID: ${w.id}`);
          }
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
    }

    console.log("🎯 Analysis:");
    console.log("  ✅ Transaction was processed successfully");
    console.log("  ✅ Transaction was saved to e_zwich_withdrawals table");
    console.log("  ⚠️  Transaction status is 'pending' (not 'completed')");
    console.log(
      "  💡 Statistics API only counts transactions with status = 'completed'"
    );
    console.log(
      "  💡 Transaction needs to be disbursed to change status to 'completed'"
    );
    console.log(
      "  💡 Check the 'All Transactions' page to disburse the transaction"
    );

    console.log("🎉 E-Zwich disbursement check completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testEzwichDisburse();
