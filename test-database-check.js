// Test script to directly check database for E-Zwich transactions
// Run this in the browser console

async function testDatabaseCheck() {
  console.log("🔍 Direct Database Check for E-Zwich Transactions...");

  try {
    const branchId = "86d0097e-9bce-4f1f-b9b4-9dd2dc9ee01c";
    const today = new Date().toISOString().split("T")[0];

    console.log("📅 Today's Date (JS):", today);
    console.log("🏢 Branch ID:", branchId);

    // Test 1: Check if there are any E-Zwich withdrawals at all
    console.log("📊 1. Checking all E-Zwich withdrawals...");
    const allWithdrawalsResponse = await fetch(
      `/api/e-zwich/withdrawals?branchId=${branchId}&limit=50`
    );
    const allWithdrawalsResult = await allWithdrawalsResponse.json();

    if (allWithdrawalsResponse.ok) {
      console.log("✅ All withdrawals API working!");
      console.log(
        `📈 Total Withdrawals Found: ${allWithdrawalsResult.total || 0}`
      );

      if (
        allWithdrawalsResult.withdrawals &&
        allWithdrawalsResult.withdrawals.length > 0
      ) {
        console.log("📋 All E-Zwich Withdrawals (showing all details):");
        allWithdrawalsResult.withdrawals.forEach((w, i) => {
          const withdrawalDate = w.transaction_date
            ? w.transaction_date.split("T")[0]
            : "No date";
          const isToday = withdrawalDate === today;
          const dateStatus = isToday ? "✅ TODAY" : "📅 OTHER";
          console.log(
            `  ${i + 1}. Amount: ${w.amount}, Status: ${
              w.status
            }, Date: ${withdrawalDate} ${dateStatus}`
          );
          console.log(`     Reference: ${w.reference}, ID: ${w.id}`);
          console.log(`     Branch ID: ${w.branch_id}, User ID: ${w.user_id}`);
          console.log(`     Full transaction_date: ${w.transaction_date}`);
        });
      } else {
        console.log("⚠️  No E-Zwich withdrawals found at all");
      }
    }

    // Test 2: Check if there are any E-Zwich card issuances at all
    console.log("📊 2. Checking all E-Zwich card issuances...");
    const allIssuancesResponse = await fetch(
      `/api/e-zwich/cards?branchId=${branchId}&limit=50`
    );
    const allIssuancesResult = await allIssuancesResponse.json();

    if (allIssuancesResponse.ok) {
      console.log("✅ All card issuances API working!");
      console.log(
        `📈 Total Card Issuances Found: ${allIssuancesResult.total || 0}`
      );

      if (allIssuancesResult.cards && allIssuancesResult.cards.length > 0) {
        console.log("📋 All E-Zwich Card Issuances (showing all details):");
        allIssuancesResult.cards.forEach((c, i) => {
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
          console.log(`     Reference: ${c.reference}, ID: ${c.id}`);
          console.log(
            `     Branch ID: ${c.branch_id}, Issued By: ${c.issued_by}`
          );
          console.log(`     Full created_at: ${c.created_at}`);
        });
      } else {
        console.log("⚠️  No E-Zwich card issuances found at all");
      }
    }

    // Test 3: Check E-Zwich statistics with different date formats
    console.log(
      "📊 3. Testing E-Zwich statistics with different date approaches..."
    );

    // Test with today's date
    const statsTodayResponse = await fetch(
      `/api/e-zwich/statistics?branchId=${branchId}`
    );
    const statsTodayResult = await statsTodayResponse.json();

    if (statsTodayResponse.ok && statsTodayResult.success) {
      console.log("✅ E-Zwich statistics API working!");
      const stats = statsTodayResult.data;
      console.log("📈 Statistics with today's date:");
      console.log(`  Today Transactions: ${stats.todayTransactions}`);
      console.log(`  Total Transactions: ${stats.totalTransactions}`);
      console.log(`  Today Volume: ${stats.todayVolume}`);
      console.log(`  Total Volume: ${stats.totalVolume}`);
    }

    // Test 4: Check if there are any transactions in the last 7 days
    console.log("📊 4. Checking for transactions in the last 7 days...");
    const lastWeekResponse = await fetch(
      `/api/e-zwich/withdrawals?branchId=${branchId}&limit=100`
    );
    const lastWeekResult = await lastWeekResponse.json();

    if (lastWeekResponse.ok && lastWeekResult.withdrawals) {
      const lastWeekTransactions = lastWeekResult.withdrawals.filter((w) => {
        const transactionDate = w.transaction_date
          ? w.transaction_date.split("T")[0]
          : "";
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        return transactionDate >= weekAgo;
      });

      console.log(
        `📅 Transactions in last 7 days: ${lastWeekTransactions.length}`
      );
      lastWeekTransactions.forEach((t, i) => {
        const date = t.transaction_date
          ? t.transaction_date.split("T")[0]
          : "No date";
        console.log(
          `  ${i + 1}. Amount: ${t.amount}, Status: ${
            t.status
          }, Date: ${date}, Reference: ${t.reference}`
        );
      });
    }

    // Test 5: Check Jumia statistics for comparison
    console.log("📊 5. Checking Jumia statistics for comparison...");
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
    }

    console.log("🎯 Analysis:");
    console.log("  🔍 Checking if transactions exist in database");
    console.log("  🔍 Checking transaction dates and timezone issues");
    console.log("  🔍 Checking if status filtering is working");
    console.log("  🔍 Comparing with Jumia statistics");

    console.log("🎉 Database check completed!");
  } catch (error) {
    console.error("❌ Database check failed:", error);
  }
}

// Run the database check
testDatabaseCheck();
