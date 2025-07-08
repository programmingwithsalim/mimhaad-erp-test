import { neon } from "@neondatabase/serverless";
import { hashPassword } from "./auth-service";

const sql = neon(process.env.DATABASE_URL!);

/**
 * Initialize user tables and create default admin user
 */
export async function initializeUserTables(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log("Initializing user tables...");

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Cashier',
        primary_branch_id UUID,
        phone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        avatar TEXT,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user roles table
    await sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create notification settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        push_notifications BOOLEAN DEFAULT true,
        low_balance_alerts BOOLEAN DEFAULT true,
        transaction_alerts BOOLEAN DEFAULT true,
        commission_alerts BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_branch ON users(primary_branch_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`;

    // Create default admin user if it doesn't exist
    await createDefaultAdminUser();

    // Create default roles
    await createDefaultRoles();

    console.log("User tables initialized successfully");
    return {
      success: true,
      message: "User tables initialized successfully",
    };
  } catch (error) {
    console.error("Error initializing user tables:", error);
    return {
      success: false,
      message: `User table initialization failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

async function createDefaultAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await sql`
      SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1
    `;

    if (existingAdmin.length === 0) {
      const hashedPassword = await hashPassword("admin123");

      await sql`
        INSERT INTO users (
          first_name, last_name, email, password_hash, role, status
        ) VALUES (
          'System', 'Administrator', 'admin@example.com', ${hashedPassword}, 'Admin', 'active'
        )
      `;

      console.log("Default admin user created: admin@example.com / admin123");
    }
  } catch (error) {
    console.error("Error creating default admin user:", error);
  }
}

async function createDefaultRoles() {
  try {
    const roles = [
      {
        name: "Admin",
        description: "System Administrator with full access",
        permissions: JSON.stringify([
          "dashboard.view",
          "transactions.view",
          "transactions.create",
          "transactions.approve",
          "transactions.reverse",
          "momo.process",
          "agency_banking.process",
          "ezwich.process",
          "power.process",
          "jumia.process",
          "float.view",
          "float.manage",
          "float.approve",
          "float.allocate",
          "expenses.view",
          "expenses.create",
          "expenses.approve",
          "commissions.view",
          "commissions.manage",
          "gl.view",
          "gl.manage",
          "accounts.reconcile",
          "users.view",
          "users.create",
          "users.edit",
          "users.delete",
          "branches.view",
          "branches.manage",
          "branches.performance",
          "reports.view",
          "reports.export",
          "audit.view",
          "settings.view",
          "settings.manage",
          "inventory.view",
          "inventory.manage",
          "transfers.initiate",
          "transfers.approve",
          "transfers.manage",
        ]),
      },
      {
        name: "Manager",
        description: "Branch Manager with management access",
        permissions: JSON.stringify([
          "dashboard.view",
          "transactions.view",
          "transactions.create",
          "transactions.approve",
          "momo.process",
          "agency_banking.process",
          "ezwich.process",
          "power.process",
          "jumia.process",
          "float.view",
          "float.manage",
          "float.approve",
          "float.allocate",
          "expenses.view",
          "expenses.create",
          "expenses.approve",
          "commissions.view",
          "commissions.manage",
          "users.view",
          "branches.view",
          "branches.performance",
          "reports.view",
          "reports.export",
          "audit.view",
          "settings.view",
          "inventory.view",
          "inventory.manage",
          "transfers.initiate",
          "transfers.approve",
          "transfers.manage",
        ]),
      },
      {
        name: "Finance",
        description: "Finance Officer with financial access",
        permissions: JSON.stringify([
          "dashboard.view",
          "transactions.view",
          "transactions.reverse",
          "float.view",
          "float.manage",
          "expenses.view",
          "expenses.create",
          "expenses.approve",
          "commissions.view",
          "commissions.manage",
          "gl.view",
          "gl.manage",
          "accounts.reconcile",
          "branches.view",
          "branches.performance",
          "reports.view",
          "reports.export",
          "audit.view",
          "settings.view",
          "inventory.view",
        ]),
      },
      {
        name: "Operations",
        description: "Operations staff with transaction access",
        permissions: JSON.stringify([
          "dashboard.view",
          "transactions.view",
          "transactions.create",
          "momo.process",
          "agency_banking.process",
          "ezwich.process",
          "power.process",
          "jumia.process",
          "float.view",
          "expenses.view",
          "commissions.view",
          "branches.view",
          "reports.view",
          "settings.view",
          "transfers.initiate",
        ]),
      },
      {
        name: "Supervisor",
        description: "Supervisor with approval access",
        permissions: JSON.stringify([
          "dashboard.view",
          "transactions.view",
          "transactions.create",
          "transactions.approve",
          "momo.process",
          "agency_banking.process",
          "ezwich.process",
          "power.process",
          "jumia.process",
          "float.view",
          "expenses.view",
          "commissions.view",
          "branches.view",
          "reports.view",
          "settings.view",
          "transfers.initiate",
          "transfers.approve",
        ]),
      },
      {
        name: "Cashier",
        description: "Cashier with basic transaction access",
        permissions: JSON.stringify([
          "dashboard.view",
          "transactions.view",
          "transactions.create",
          "momo.process",
          "agency_banking.process",
          "ezwich.process",
          "power.process",
          "jumia.process",
          "float.view",
          "settings.view",
        ]),
      },
    ];

    for (const role of roles) {
      await sql`
        INSERT INTO user_roles (name, description, permissions)
        VALUES (${role.name}, ${role.description}, ${role.permissions})
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions
      `;
    }

    console.log("Default roles created successfully");
  } catch (error) {
    console.error("Error creating default roles:", error);
  }
}
