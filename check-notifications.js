const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function checkNotifications() {
  try {
    console.log("🔍 Checking notifications table...");

    // Check if table exists and its structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `;

    console.log("📋 Table structure:");
    console.table(tableInfo);

    // Check if there are any notifications
    const count = await sql`
      SELECT COUNT(*) as total_notifications
      FROM notifications
    `;

    console.log(`📊 Total notifications: ${count[0].total_notifications}`);

    // Get current user to add test notifications
    const users = await sql`
      SELECT id, name, email
      FROM users
      WHERE status = 'active'
      LIMIT 1
    `;

    if (users.length === 0) {
      console.log("❌ No active users found");
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Using user: ${users[0].name} (${users[0].email})`);

    // Add some test notifications
    const testNotifications = [
      {
        type: "transaction",
        title: "Transaction Completed",
        message: "MoMo Cash Out of GHS 100.00 processed successfully",
        user_id: userId,
      },
      {
        type: "system",
        title: "System Update",
        message: "Float balance monitoring is now active",
        user_id: userId,
      },
      {
        type: "security",
        title: "Security Alert",
        message: "Unusual login activity detected from new location",
        user_id: userId,
      },
    ];

    console.log("➕ Adding test notifications...");

    for (const notification of testNotifications) {
      const result = await sql`
        INSERT INTO notifications (type, title, message, user_id, created_at)
        VALUES (${notification.type}, ${notification.title}, ${notification.message}, ${notification.user_id}, NOW())
        RETURNING id
      `;
      console.log(
        `✅ Added notification: ${notification.title} (ID: ${result[0].id})`
      );
    }

    // Check notifications again
    const finalCount = await sql`
      SELECT COUNT(*) as total_notifications
      FROM notifications
    `;

    console.log(
      `📊 Final total notifications: ${finalCount[0].total_notifications}`
    );

    // Show some sample notifications
    const sampleNotifications = await sql`
      SELECT id, type, title, message, created_at
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log("📝 Sample notifications:");
    console.table(sampleNotifications);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkNotifications();
