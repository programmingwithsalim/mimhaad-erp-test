// Test script to check profit-loss API
const testProfitLossAPI = async () => {
  try {
    const response = await fetch(
      "/api/reports/profit-loss?from=2024-01-01&to=2024-12-31&branch=all",
      {
        credentials: "include",
      }
    );

    const data = await response.json();
    console.log("Profit & Loss API Response:", data);

    if (data.success) {
      console.log("✅ API is working");
      console.log("Revenue breakdown:", data.data.revenue.breakdown);
      console.log("Total revenue:", data.data.revenue.total);
      console.log("Expenses breakdown:", data.data.expenses.breakdown);
      console.log("Total expenses:", data.data.expenses.total);
      console.log("Net income:", data.data.profitLoss.netIncome);
    } else {
      console.log("❌ API failed:", data.error);
    }
  } catch (error) {
    console.error("❌ Error testing API:", error);
  }
};

// Run the test
testProfitLossAPI();
