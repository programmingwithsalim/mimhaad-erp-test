import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Get a sample branch ID
    const branches = await sql`SELECT id FROM branches LIMIT 1`;
    if (!branches || branches.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No branches found. Please create branches first.",
      });
    }

    const branchId = branches[0].id;

    // Seed sample momo transactions
    await sql`
      INSERT INTO momo_transactions (id, customer_name, phone_number, amount, fee, provider, type, reference, status, branch_id, processed_by, date)
      VALUES 
        (gen_random_uuid(), 'John Doe', '233244123456', 100.00, 2.00, 'MTN', 'send', 'REF001', 'completed', ${branchId}, 'System', CURRENT_DATE - INTERVAL '5 days'),
        (gen_random_uuid(), 'Jane Smith', '233244789012', 250.00, 5.00, 'Vodafone', 'receive', 'REF002', 'completed', ${branchId}, 'System', CURRENT_DATE - INTERVAL '3 days'),
        (gen_random_uuid(), 'Bob Johnson', '233244345678', 75.50, 1.50, 'AirtelTigo', 'send', 'REF003', 'completed', ${branchId}, 'System', CURRENT_DATE - INTERVAL '1 day')
      ON CONFLICT DO NOTHING
    `;

    // Seed sample agency banking transactions
    await sql`
      INSERT INTO agency_banking_transactions (id, type, amount, fee, customer_name, account_number, partner_bank, partner_bank_code, partner_bank_id, reference, status, date, branch_id, user_id)
      VALUES 
        (gen_random_uuid(), 'deposit', 500.00, 10.00, 'Alice Brown', '1234567890', 'Ghana Commercial Bank', 'GCB', 'GCB001', 'AGY001', 'completed', CURRENT_DATE - INTERVAL '4 days', ${branchId}, gen_random_uuid()),
        (gen_random_uuid(), 'withdrawal', 300.00, 5.00, 'Charlie Wilson', '0987654321', 'Ecobank', 'ECO', 'ECO001', 'AGY002', 'completed', CURRENT_DATE - INTERVAL '2 days', ${branchId}, gen_random_uuid())
      ON CONFLICT DO NOTHING
    `;

    // Seed sample power transactions
    await sql`
      INSERT INTO power_transactions (id, reference, type, meter_number, provider, amount, commission, customer_name, customer_phone, status, branch_id, user_id, date)
      VALUES 
        (gen_random_uuid(), 'PWR001', 'sale', '123456789', 'ECG', 50.00, 2.50, 'David Lee', '233244111111', 'completed', ${branchId}, gen_random_uuid(), CURRENT_DATE - INTERVAL '6 days'),
        (gen_random_uuid(), 'PWR002', 'sale', '987654321', 'VRA', 75.00, 3.75, 'Eva Garcia', '233244222222', 'completed', ${branchId}, gen_random_uuid(), CURRENT_DATE - INTERVAL '2 days')
      ON CONFLICT DO NOTHING
    `;

    // Seed sample expenses
    await sql`
      INSERT INTO expenses (id, reference_number, branch_id, expense_head_id, amount, description, expense_date, payment_source, status, created_by)
      VALUES 
        (gen_random_uuid(), 'EXP001', ${branchId}, gen_random_uuid(), 25.00, 'Office supplies', CURRENT_DATE - INTERVAL '3 days', 'cash', 'paid', gen_random_uuid()),
        (gen_random_uuid(), 'EXP002', ${branchId}, gen_random_uuid(), 50.00, 'Transportation', CURRENT_DATE - INTERVAL '1 day', 'cash', 'paid', gen_random_uuid())
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({
      success: true,
      message: "Sample transaction data seeded successfully",
      data: {
        branchId,
        transactionsAdded: {
          momo: 3,
          agency_banking: 2,
          power: 2,
          expenses: 2,
        }
      }
    });
  } catch (error) {
    console.error("Error seeding sample transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed sample transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 