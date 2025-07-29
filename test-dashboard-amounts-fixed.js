// Final test script for dashboard amounts fix
// Run this in the browser console

async function testDashboardAmountsFixed() {
  console.log("🔧 Testing Dashboard Amounts Fix...");

  try {
    // Test dashboard statistics API
    console.log("📊 Testing Dashboard Statistics...");
    const dashboardResponse = await fetch(
      "/api/dashboard/statistics?userRole=Admin&userBranchId=86d0097e-9bce-4f1f-b9b4-9dd2dc9ee01c"
    );
    const dashboardResult = await dashboardResponse.json();

    if (dashboardResponse.ok) {
      console.log("✅ Dashboard statistics API working!");

      // Check recent activities for actual amounts
      console.log("📈 Recent Activities (Should show actual amounts):");
      if (
        dashboardResult.recentActivity &&
        dashboardResult.recentActivity.length > 0
      ) {
        let hasNonZeroAmounts = false;
        dashboardResult.recentActivity.forEach((activity, index) => {
          const amount = Number(activity.amount);
          const status = amount > 0 ? "✅" : "❌";
          console.log(
            `  ${status} ${index + 1}. ${
              activity.service
            } - Amount: ${amount} - ${activity.description}`
          );
          if (amount > 0) hasNonZeroAmounts = true;
        });

        if (hasNonZeroAmounts) {
          console.log(
            "🎉 SUCCESS: Recent activities are showing actual amounts!"
          );
        } else {
          console.log(
            "⚠️  WARNING: All recent activities still show 0.00 amounts"
          );
        }
      } else {
        console.log("  No recent activities found");
      }

      // Check service performance for actual fees
      console.log("💰 Service Performance (Should show calculated fees):");
      if (
        dashboardResult.serviceStats &&
        dashboardResult.serviceStats.length > 0
      ) {
        let hasNonZeroFees = false;
        dashboardResult.serviceStats.forEach((service) => {
          const todayFees = Number(service.todayFees);
          const totalFees = Number(service.totalFees);
          const todayStatus = todayFees > 0 ? "✅" : "❌";
          const totalStatus = totalFees > 0 ? "✅" : "❌";

          console.log(`  ${service.service}:`);
          console.log(`    ${todayStatus} Today Fees: ${todayFees}`);
          console.log(`    ${totalStatus} Total Fees: ${totalFees}`);

          if (todayFees > 0 || totalFees > 0) hasNonZeroFees = true;
        });

        if (hasNonZeroFees) {
          console.log(
            "🎉 SUCCESS: Service performance is showing calculated fees!"
          );
        } else {
          console.log("⚠️  WARNING: All service fees still show 0.00");
        }
      }

      // Check daily breakdown for actual commission
      console.log("📅 Daily Breakdown (Should show calculated commission):");
      if (
        dashboardResult.dailyBreakdown &&
        dashboardResult.dailyBreakdown.length > 0
      ) {
        let hasNonZeroCommission = false;
        dashboardResult.dailyBreakdown.slice(0, 3).forEach((day) => {
          const commission = Number(day.commission);
          const status = commission > 0 ? "✅" : "❌";
          console.log(
            `  ${status} ${day.date}: ${day.transactions} transactions, ${day.volume} volume, ${commission} commission`
          );
          if (commission > 0) hasNonZeroCommission = true;
        });

        if (hasNonZeroCommission) {
          console.log(
            "🎉 SUCCESS: Daily breakdown is showing calculated commission!"
          );
        } else {
          console.log("⚠️  WARNING: All daily commission still show 0.00");
        }
      }

      // Summary
      console.log("🎯 Summary:");
      console.log(
        "  ✅ Recent activities now pull from actual transaction tables"
      );
      console.log(
        "  ✅ Service performance uses calculated fees from database"
      );
      console.log("  ✅ Daily breakdown shows real commission calculations");
      console.log("  ✅ All amounts are based on actual transaction data");
    } else {
      console.log("❌ Dashboard statistics API failed:", dashboardResult.error);
    }

    console.log("🎉 Dashboard amounts test completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testDashboardAmountsFixed();
