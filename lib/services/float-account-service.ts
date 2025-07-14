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
  account_number: string;
  current_balance: number;
  min_threshold: number;
  max_threshold: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_updated: string;
  isezwichpartner: boolean;
  name: string;
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
    account_number: string;
    initial_balance?: number;
  }): Promise<FloatAccount> {
    const {
      branch_id,
      account_type,
      provider,
      account_number,
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
        account_number,
        current_balance,
        min_threshold,
        max_threshold,
        is_active,
        created_by,
        created_at,
        updated_at,
        last_updated,
        isezwichpartner
      ) VALUES (
        gen_random_uuid(),
        ${branch_id},
        ${account_type},
        ${provider || null},
        ${account_number},
        ${initial_balance},
        ${0},
        ${0},
        true,
        ${"system"},
        NOW(),
        NOW(),
        NOW(),
        false
      ) RETURNING *
    `;

    const newFloatAccount = floatAccount.rows[0];

    // Automatically create GL account for this float account
    const glAccount = await this.createGLAccountForFloatAccount(
      newFloatAccount
    );

    // Automatically create GL mappings for this float account
    await this.createGLMappingsForFloatAccount(newFloatAccount, glAccount.id);

    // After creating the float account, add:
    await this.createAllGLAccountsAndMappingsForFloatAccount(newFloatAccount);

    console.log(`✅ Created float account: ${account_number} with GL mappings`);

    return {
      ...newFloatAccount,
      current_balance: Number(newFloatAccount.current_balance),
    };
  }

  /**
   * Create a GL account for a float account
   */
  private static async createGLAccountForFloatAccount(
    floatAccount: any
  ): Promise<any> {
    const glAccountCode = this.generateGLAccountCode(floatAccount);
    const accountType = this.prettyType(floatAccount.account_type);
    const provider = floatAccount.provider ? ` - ${floatAccount.provider}` : "";
    const glAccountName = `${accountType} Float Account${provider}`;

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
        mappings.push({
          transaction_type: "momo_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "asset",
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
        mappings.push({
          transaction_type: "agency_banking_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "asset",
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
        mappings.push({
          transaction_type: "e_zwich_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "asset",
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
        mappings.push({
          transaction_type: "power_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "asset",
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
        mappings.push({
          transaction_type: "jumia_float",
          gl_account_id: glAccountId,
          float_account_id: floatAccountId,
          mapping_type: "asset",
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
      current_balance: Number(result.rows[0].current_balance),
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
      current_balance: Number(row.current_balance),
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
      SET current_balance = ${newBalance}, updated_at = NOW()
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

  private static async createAllGLAccountsAndMappingsForFloatAccount(
    floatAccount: any
  ): Promise<void> {
    // Define the GL account types and mapping types needed for each float account type
    const glTypes = [
      { type: "Asset", suffix: "", mapping: "main" },
      { type: "Revenue", suffix: "-REV", mapping: "revenue" },
      { type: "Expense", suffix: "-EXP", mapping: "expense" },
      { type: "Revenue", suffix: "-COM", mapping: "commission" }, // Fixed: Commission should be Revenue
      { type: "Revenue", suffix: "-FEE", mapping: "fee" },
    ];
    const branchCode = floatAccount.branch_id.substring(0, 6);
    const provider = floatAccount.provider
      ? `-${floatAccount.provider.toUpperCase().replace(/\s/g, "")}`
      : "";
    const baseCode = (() => {
      switch (floatAccount.account_type) {
        case "cash_till":
          return `CASH-${branchCode}`;
        case "momo":
          return `MOMO-${branchCode}${provider}`;
        case "agency_banking":
          return `AGB-${branchCode}${provider}`;
        case "e_zwich":
          return `EZWICH-${branchCode}`;
        case "power":
          return `PWR-${branchCode}${provider}`;
        case "jumia":
          return `JUMIA-${branchCode}`;
        default:
          return `FLOAT-${branchCode}-${
            floatAccount.account_type?.toUpperCase() || "UNKNOWN"
          }`;
      }
    })();

    // For each GL type, create if not exists
    const glAccounts: Record<string, any> = {};
    for (const { type, suffix, mapping } of glTypes) {
      const code = baseCode + suffix;

      // Check if GL account exists
      const existing =
        await sql`SELECT * FROM gl_accounts WHERE code = ${code} AND branch_id = ${floatAccount.branch_id}`;
      let glAccount;
      if (existing.rows.length > 0) {
        glAccount = existing.rows[0];
      } else {
        const name = this.generateGLAccountName(floatAccount, type, mapping);

        const result = await sql`
          INSERT INTO gl_accounts (id, code, name, type, branch_id, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), ${code}, ${name}, ${type}, ${floatAccount.branch_id}, true, NOW(), NOW())
          RETURNING *
        `;
        glAccount = result.rows[0];
      }
      glAccounts[mapping] = glAccount;
    }

    // Create mappings for normal transaction types
    for (const mapping of Object.keys(glAccounts)) {
      // Check if mapping exists
      const exists = await sql`
        SELECT * FROM gl_mappings WHERE float_account_id = ${floatAccount.id} AND mapping_type = ${mapping} AND is_active = true
      `;
      if (exists.rows.length === 0) {
        await sql`
          INSERT INTO gl_mappings (
            id, branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${floatAccount.branch_id},
            ${floatAccount.account_type + "_float"},
            ${glAccounts[mapping].id},
            ${floatAccount.id},
            ${mapping},
            true,
            NOW(),
            NOW()
          )
        `;
      }
    }

    // Create reversal mappings for transaction reversals
    await this.createReversalGLMappings(floatAccount, glAccounts);
  }

  /**
   * Create reversal GL mappings for a float account
   */
  private static async createReversalGLMappings(
    floatAccount: any,
    glAccounts: Record<string, any>
  ): Promise<void> {
    // Define reversal transaction types based on account type
    const reversalTransactionTypes = this.getReversalTransactionTypes(
      floatAccount.account_type
    );

    console.log(
      `🔄 [FLOAT] Creating reversal GL mappings for ${floatAccount.account_type} account`
    );

    for (const reversalType of reversalTransactionTypes) {
      for (const mapping of Object.keys(glAccounts)) {
        // Check if reversal mapping already exists
        const exists = await sql`
          SELECT * FROM gl_mappings 
          WHERE float_account_id = ${floatAccount.id} 
          AND transaction_type = ${reversalType} 
          AND mapping_type = ${mapping} 
          AND is_active = true
        `;

        if (exists.rows.length === 0) {
          await sql`
            INSERT INTO gl_mappings (
              id, branch_id, transaction_type, gl_account_id, float_account_id, mapping_type, is_active, created_at, updated_at
            ) VALUES (
              gen_random_uuid(),
              ${floatAccount.branch_id},
              ${reversalType},
              ${glAccounts[mapping].id},
              ${floatAccount.id},
              ${mapping},
              true,
              NOW(),
              NOW()
            )
          `;
          console.log(
            `✅ [FLOAT] Created reversal mapping: ${reversalType} -> ${mapping}`
          );
        }
      }
    }
  }

  /**
   * Get reversal transaction types for a given account type
   */
  private static getReversalTransactionTypes(accountType: string): string[] {
    switch (accountType) {
      case "momo":
        return [
          "reversal_cash-in",
          "reversal_cash-out",
          "reversal_deposit",
          "reversal_withdrawal",
        ];
      case "agency_banking":
        return ["reversal_deposit", "reversal_withdrawal"];
      case "e_zwich":
        return ["reversal_card_issuance", "reversal_withdrawal"];
      case "power":
        return ["reversal_purchase", "reversal_payment"];
      case "jumia":
        return ["reversal_purchase", "reversal_payment"];
      case "cash_till":
        return ["reversal_cash-in", "reversal_cash-out"];
      default:
        return ["reversal_deposit", "reversal_withdrawal"];
    }
  }

  private static generateGLAccountName(
    floatAccount: any,
    type: string,
    mapping: string
  ): string {
    // Handle undefined account_type
    if (!floatAccount.account_type) {
      return `Unknown Float Account${
        floatAccount.provider ? ` - ${floatAccount.provider}` : ""
      }`;
    }

    const provider = floatAccount.provider ? ` - ${floatAccount.provider}` : "";
    const accountType = this.prettyType(floatAccount.account_type);

    switch (mapping) {
      case "main":
        return `${accountType} Float Account${provider}`;
      case "revenue":
        return `${accountType} Fee Revenue${provider}`; // For fee income from transactions
      case "expense":
        return `${accountType} Fee Expense${provider}`; // For fee expenses (net effect with revenue)
      case "commission":
        return `${accountType} Commission Revenue${provider}`; // For commission income
      case "fee":
        return `${accountType} Transaction Fees${provider}`; // For transaction fee tracking
      default:
        return `${accountType} GL Account${provider}`;
    }
  }

  private static prettyType(type: string): string {
    switch (type) {
      case "cash_till":
        return "Cash in Till";
      case "momo":
        return "MoMo";
      case "agency_banking":
        return "Agency Banking";
      case "e_zwich":
        return "E-Zwich";
      case "power":
        return "Power";
      case "jumia":
        return "Jumia";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
}
