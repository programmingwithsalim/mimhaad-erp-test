import { sql } from "@vercel/postgres";

export interface FloatAccount {
  id: string;
  branch_id: string;
  account_type:
    | "cash_till"
    | "momo"
    | "agency_banking"
    | "e_zwich"
    | "power"
    | "jumia";
  provider?: string; // For power (NEDCo, ECG), momo (MTN, Telecel, etc.)
  account_name: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class FloatAccountService {
  /**
   * Create a float account and automatically create GL mappings
   */
  static async createFloatAccount(data: {
    branch_id: string;
    account_type:
      | "cash_till"
      | "momo"
      | "agency_banking"
      | "e_zwich"
      | "power"
      | "jumia";
    provider?: string;
    account_name: string;
    initial_balance?: number;
  }): Promise<FloatAccount> {
    const {
      branch_id,
      account_type,
      provider,
      account_name,
      initial_balance = 0,
    } = data;

    // Check if this type of account already exists for this branch
    if (account_type === "cash_till") {
      const existingCashTill = await sql`
        SELECT id FROM float_accounts 
        WHERE branch_id = ${branch_id} 
        AND account_type = 'cash_till' 
        AND is_active = true
      `;

      if (existingCashTill.rows.length > 0) {
        throw new Error(
          `Cash in Till account already exists for branch ${branch_id}`
        );
      }
    } else if (account_type === "power" && provider) {
      const existingPowerAccount = await sql`
        SELECT id FROM float_accounts 
        WHERE branch_id = ${branch_id} 
        AND account_type = 'power' 
        AND provider = ${provider}
        AND is_active = true
      `;

      if (existingPowerAccount.rows.length > 0) {
        throw new Error(
          `Power float account for ${provider} already exists for branch ${branch_id}`
        );
      }
    }

    // Create the float account
    const floatAccount = await sql`
      INSERT INTO float_accounts (
        id,
        branch_id,
        account_type,
        provider,
        account_name,
        balance,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${branch_id},
        ${account_type},
        ${provider || null},
        ${account_name},
        ${initial_balance},
        true,
        NOW(),
        NOW()
      ) RETURNING *
    `;

    const newFloatAccount = floatAccount.rows[0];

    // Automatically create GL account for this float account
    const glAccount = await this.createGLAccountForFloatAccount(
      newFloatAccount
    );

    // Automatically create GL mappings for this float account
    await this.createGLMappingsForFloatAccount(newFloatAccount, glAccount.id);

    console.log(`✅ Created float account: ${account_name} with GL mappings`);

    return {
      ...newFloatAccount,
      balance: Number(newFloatAccount.balance),
    };
  }

  /**
   * Create a GL account for a float account
   */
  private static async createGLAccountForFloatAccount(
    floatAccount: any
  ): Promise<any> {
    const glAccountCode = this.generateGLAccountCode(floatAccount);
    const glAccountName = `${floatAccount.account_name} GL Account`;

    const glAccount = await sql`
      INSERT INTO gl_accounts (
        id,
        code,
        name,
        type,
        branch_id,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${glAccountCode},
        ${glAccountName},
        'Asset',
        ${floatAccount.branch_id},
        true,
        NOW(),
        NOW()
      ) RETURNING *
    `;

    return glAccount.rows[0];
  }

  /**
   * Generate GL account code for float account
   */
  private static generateGLAccountCode(floatAccount: any): string {
    const branchCode = floatAccount.branch_id.substring(0, 6);

    switch (floatAccount.account_type) {
      case "cash_till":
        return `CASH-${branchCode}`;
      case "momo":
        return `MOMO-${branchCode}-${
          floatAccount.provider?.toUpperCase() || "GEN"
        }`;
      case "agency_banking":
        return `AGB-${branchCode}-${
          floatAccount.provider?.toUpperCase() || "GEN"
        }`;
      case "e_zwich":
        return `EZWICH-${branchCode}`;
      case "power":
        return `PWR-${branchCode}-${
          floatAccount.provider?.toUpperCase() || "GEN"
        }`;
      case "jumia":
        return `JUMIA-${branchCode}`;
      default:
        return `FLOAT-${branchCode}-${floatAccount.account_type.toUpperCase()}`;
    }
  }

  /**
   * Create GL mappings for a float account
   */
  private static async createGLMappingsForFloatAccount(
    floatAccount: any,
    glAccountId: string
  ): Promise<void> {
    const mappings = this.getRequiredMappingsForAccountType(
      floatAccount.account_type,
      glAccountId,
      floatAccount.id
    );

    for (const mapping of mappings) {
      await sql`
        INSERT INTO gl_mappings (
          id,
          branch_id,
          transaction_type,
          gl_account_id,
          float_account_id,
          mapping_type,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${floatAccount.branch_id},
          ${mapping.transaction_type},
          ${mapping.gl_account_id},
          ${mapping.float_account_id},
          ${mapping.mapping_type},
          true,
          NOW(),
          NOW()
        )
      `;
    }
  }

  /**
   * Get required GL mappings for an account type
   */
  private static getRequiredMappingsForAccountType(
    accountType: string,
    glAccountId: string,
    floatAccountId: string
  ): Array<{
    transaction_type: string;
    gl_account_id: string;
    float_account_id: string;
    mapping_type: string;
  }> {
    const mappings = [];

    switch (accountType) {
      case "cash_till":
        // Cash in Till mappings
        mappings.push({
          transaction_type: "cash_in_till",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "main",
        });
        break;

      case "momo":
        // MoMo mappings
        mappings.push({
          transaction_type: "momo_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "main",
        });
        mappings.push({
          transaction_type: "momo_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "float",
        });
        break;

      case "agency_banking":
        // Agency Banking mappings
        mappings.push({
          transaction_type: "agency_banking_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "main",
        });
        mappings.push({
          transaction_type: "agency_banking_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "float",
        });
        break;

      case "e_zwich":
        // E-Zwich mappings
        mappings.push({
          transaction_type: "e_zwich_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "main",
        });
        mappings.push({
          transaction_type: "e_zwich_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "float",
        });
        break;

      case "power":
        // Power mappings
        mappings.push({
          transaction_type: "power_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "main",
        });
        mappings.push({
          transaction_type: "power_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "float",
        });
        break;

      case "jumia":
        // Jumia mappings
        mappings.push({
          transaction_type: "jumia_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "main",
        });
        mappings.push({
          transaction_type: "jumia_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "float",
        });
        break;
    }

    return mappings;
  }

  /**
   * Get float account by ID
   */
  static async getFloatAccountById(id: string): Promise<FloatAccount | null> {
    const result = await sql`
      SELECT * FROM float_accounts WHERE id = ${id} AND is_active = true
    `;

    if (result.rows.length === 0) return null;

    return {
      ...result.rows[0],
      balance: Number(result.rows[0].balance),
    };
  }

  /**
   * Get float accounts for a branch
   */
  static async getFloatAccountsByBranch(
    branchId: string
  ): Promise<FloatAccount[]> {
    const result = await sql`
      SELECT * FROM float_accounts 
      WHERE branch_id = ${branchId} AND is_active = true
      ORDER BY account_type, provider, created_at
    `;

    return result.rows.map((row) => ({
      ...row,
      balance: Number(row.balance),
    }));
  }

  /**
   * Update float account balance
   */
  static async updateFloatAccountBalance(
    id: string,
    newBalance: number
  ): Promise<void> {
    await sql`
      UPDATE float_accounts 
      SET balance = ${newBalance}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  /**
   * Deactivate float account
   */
  static async deactivateFloatAccount(id: string): Promise<void> {
    await sql`
      UPDATE float_accounts 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `;
  }
}
