import { NextRequest, NextResponse } from "next/server";
import { getDatabaseSession } from "@/lib/database-session-service";
import { sql } from "@/lib/db";
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const session = await getDatabaseSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Create backup
    const backupResult = await createSystemBackup();

    return NextResponse.json({
      success: true,
      data: backupResult,
      message: "System backup created successfully",
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

async function createSystemBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupId = `backup_${timestamp}`;

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get database schema
    const schemaResult = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `;

    // Get sample data from key tables
    const usersData = await sql`SELECT * FROM users LIMIT 100`;
    const branchesData = await sql`SELECT * FROM branches LIMIT 100`;
    const transactionsData = await sql`SELECT * FROM transactions LIMIT 1000`;
    const glAccountsData = await sql`SELECT * FROM gl_accounts LIMIT 100`;

    // Create backup object
    const backupData = {
      backupId,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      schema: schemaResult,
      data: {
        users: usersData,
        branches: branchesData,
        transactions: transactionsData,
        glAccounts: glAccountsData,
      },
      metadata: {
        totalUsers: usersData.length,
        totalBranches: branchesData.length,
        totalTransactions: transactionsData.length,
        totalGlAccounts: glAccountsData.length,
      },
    };

    // Save backup to file
    const backupFilePath = path.join(backupDir, `${backupId}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));

    // Record backup in database
    const backupRecord = await sql`
      INSERT INTO system_backups (
        backup_id,
        backup_type,
        status,
        file_path,
        size_bytes,
        metadata,
        created_at
      ) VALUES (
        ${backupId},
        'manual',
        'completed',
        ${backupFilePath},
        ${fs.statSync(backupFilePath).size},
        ${JSON.stringify(backupData.metadata)},
        NOW()
      ) RETURNING *
    `;

    return {
      backupId,
      filePath: backupFilePath,
      size: fs.statSync(backupFilePath).size,
      metadata: backupData.metadata,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating backup:", error);
    throw error;
  }
}
