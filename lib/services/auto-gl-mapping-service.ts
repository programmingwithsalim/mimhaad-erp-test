import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id?: string;
  balance: number;
  is_active: boolean;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

export interface GLMapping {
  id: string;
  transaction_type: string;
  gl_account_id: string;
  mapping_type: string;
  branch_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class AutoGLMappingService {
  /**
   * Auto-create missing GL mappings for a transaction
   */
  static async ensureGLMappings(
    sourceModule: string,
    transactionType: string,
    branchId: string,
    requiredMappings: string[]
  ): Promise<Record<string, string>> {
    console.log(
      `🔧 [AUTO-MAPPING] Ensuring GL mappings for ${sourceModule}/${transactionType} in branch ${branchId}`
    );

    const result: Record<string, string> = {};

    for (const mappingType of requiredMappings) {
      try {
        const accountId = await this.ensureGLMapping(
          sourceModule,
          transactionType,
          mappingType,
          branchId
        );
        result[mappingType] = accountId;
      } catch (error) {
        console.error(
          `🔧 [AUTO-MAPPING] Failed to ensure mapping for ${mappingType}:`,
          error
        );
        throw error;
      }
    }

    console.log(`🔧 [AUTO-MAPPING] Completed mappings:`, result);
    return result;
  }

  /**
   * Auto-create reversal mappings for a transaction type
   */
  static async ensureReversalMappings(
    sourceModule: string,
    baseTransactionType: string,
    branchId: string,
    existingMappings: Record<string, string>
  ): Promise<void> {
    console.log(
      `🔄 [AUTO-MAPPING] Ensuring reversal mappings for ${sourceModule}/${baseTransactionType} in branch ${branchId}`
    );

    // Define reversal transaction types based on source module
    const reversalTypes = this.getReversalTransactionTypes(
      sourceModule,
      baseTransactionType
    );

    for (const reversalType of reversalTypes) {
      for (const [mappingType, glAccountId] of Object.entries(
        existingMappings
      )) {
        try {
          await this.ensureGLMapping(
            sourceModule,
            reversalType,
            mappingType,
            branchId
          );
          console.log(
            `✅ [AUTO-MAPPING] Created reversal mapping: ${reversalType} -> ${mappingType}`
          );
        } catch (error) {
          console.warn(
            `⚠️ [AUTO-MAPPING] Failed to create reversal mapping ${reversalType} -> ${mappingType}:`,
            error
          );
        }
      }
    }
  }

  /**
   * Get reversal transaction types for a source module
   */
  private static getReversalTransactionTypes(
    sourceModule: string,
    baseTransactionType: string
  ): string[] {
    switch (sourceModule) {
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
        return [
          "reversal_card_issuance",
          "reversal_withdrawal",
          "reversal_settlement",
        ];
      case "power":
        return ["reversal_purchase", "reversal_payment"];
      case "jumia":
        return ["reversal_purchase", "reversal_payment", "reversal_collection"];
      case "expenses":
        return ["reversal_expense_payment"];
      case "commissions":
        return ["reversal_commission_payment"];
      case "float_transfers":
        return ["reversal_float_transfer", "reversal_float_allocation"];
      default:
        // For unknown modules, create a generic reversal type
        return [`reversal_${baseTransactionType}`];
    }
  }

  /**
   * Ensure a specific GL mapping exists, create if missing
   */
  private static async ensureGLMapping(
    sourceModule: string,
    transactionType: string,
    mappingType: string,
    branchId: string
  ): Promise<string> {
    // First, check if mapping already exists
    const existingMapping = await sql`
      SELECT gl_account_id 
      FROM gl_mappings 
      WHERE transaction_type = ${transactionType}
        AND mapping_type = ${mappingType}
        AND branch_id = ${branchId}
        AND is_active = true
    `;

    if (existingMapping.length > 0) {
      console.log(
        `🔧 [AUTO-MAPPING] Found existing mapping for ${transactionType}/${mappingType}: ${existingMapping[0].gl_account_id}`
      );
      return existingMapping[0].gl_account_id;
    }

    // Mapping doesn't exist, create it
    console.log(
      `🔧 [AUTO-MAPPING] Creating missing mapping for ${transactionType}/${mappingType}`
    );

    // Get or create the GL account
    const accountId = await this.ensureGLAccount(
      sourceModule,
      transactionType,
      mappingType,
      branchId
    );

    // Create the mapping
    const mappingId = crypto.randomUUID();
    await sql`
      INSERT INTO gl_mappings (id, transaction_type, gl_account_id, mapping_type, branch_id, is_active, created_at, updated_at)
      VALUES (${mappingId}, ${transactionType}, ${accountId}, ${mappingType}, ${branchId}, true, NOW(), NOW())
    `;

    console.log(
      `🔧 [AUTO-MAPPING] Created mapping ${mappingId} for ${transactionType}/${mappingType} -> ${accountId}`
    );
    return accountId;
  }

  /**
   * Ensure a GL account exists, create if missing
   */
  private static async ensureGLAccount(
    sourceModule: string,
    transactionType: string,
    mappingType: string,
    branchId: string
  ): Promise<string> {
    // Generate account details based on module and mapping type
    const accountDetails = await this.generateAccountDetails(
      sourceModule,
      transactionType,
      mappingType,
      branchId
    );

    // Check if account already exists
    const existingAccount = await sql`
      SELECT id 
      FROM gl_accounts 
      WHERE code = ${accountDetails.code}
        AND branch_id = ${branchId}
        AND is_active = true
    `;

    if (existingAccount.length > 0) {
      console.log(
        `🔧 [AUTO-MAPPING] Found existing account for ${accountDetails.code}: ${existingAccount[0].id}`
      );
      return existingAccount[0].id;
    }

    // Account doesn't exist, create it
    console.log(
      `🔧 [AUTO-MAPPING] Creating missing account: ${accountDetails.code} - ${accountDetails.name}`
    );

    const accountId = crypto.randomUUID();
    await sql`
      INSERT INTO gl_accounts (id, code, name, type, parent_id, balance, is_active, branch_id, created_at, updated_at)
      VALUES (${accountId}, ${accountDetails.code}, ${accountDetails.name}, ${accountDetails.type}, NULL, 0, true, ${branchId}, NOW(), NOW())
    `;

    console.log(
      `🔧 [AUTO-MAPPING] Created account ${accountId}: ${accountDetails.code} - ${accountDetails.name}`
    );
    return accountId;
  }

  /**
   * Get branch code from branch table
   */
  private static async getBranchCode(branchId: string): Promise<string> {
    try {
      const branch = await sql`
        SELECT code FROM branches WHERE id = ${branchId}
      `;

      if (branch.length > 0 && branch[0].code) {
        return branch[0].code.toUpperCase();
      }

      // Fallback to UUID substring if no code found
      console.warn(
        `🔧 [AUTO-MAPPING] No branch code found for ${branchId}, using UUID substring`
      );
      return branchId.substring(0, 8).toUpperCase();
    } catch (error) {
      console.warn(
        `🔧 [AUTO-MAPPING] Error fetching branch code for ${branchId}:`,
        error
      );
      return branchId.substring(0, 8).toUpperCase();
    }
  }

  /**
   * Generate account details based on module and mapping type
   */
  private static async generateAccountDetails(
    sourceModule: string,
    transactionType: string,
    mappingType: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    // Get branch code from branch table
    const branchCode = await this.getBranchCode(branchId);

    switch (sourceModule) {
      case "expenses":
        return await this.generateExpenseAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "momo":
        return await this.generateMoMoAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "agency_banking":
        return await this.generateAgencyBankingAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "e_zwich":
        return await this.generateEzwichAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "power":
        return await this.generatePowerAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "jumia":
        return await this.generateJumiaAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "commissions":
        return await this.generateCommissionAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "float_transfers":
        return await this.generateFloatTransferAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      case "cash_till":
        return await this.generateCashTillAccountDetails(
          transactionType,
          mappingType,
          branchCode,
          branchId
        );
      default:
        return this.generateDefaultAccountDetails(
          sourceModule,
          transactionType,
          mappingType,
          branchCode
        );
    }
  }

  /**
   * Get the primary provider for a module in a branch
   */
  private static async getPrimaryProvider(
    module: string,
    branchId: string
  ): Promise<string | null> {
    try {
      // Map module to account type
      const accountTypeMap: Record<string, string> = {
        momo: "momo",
        agency_banking: "agency_banking",
        e_zwich: "e_zwich",
        power: "power",
        jumia: "jumia",
      };

      const accountType = accountTypeMap[module];
      if (!accountType) return null;

      // Get the primary (first active) float account for this module and branch
      const floatAccount = await sql`
        SELECT provider 
        FROM float_accounts 
        WHERE account_type = ${accountType}
          AND branch_id = ${branchId}
          AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      `;

      if (floatAccount.length > 0 && floatAccount[0].provider) {
        return floatAccount[0].provider;
      }

      // If no provider found, return null (will use default naming)
      return null;
    } catch (error) {
      console.warn(
        `🔧 [AUTO-MAPPING] Error fetching provider for ${module}:`,
        error
      );
      return null;
    }
  }

  /**
   * Generate standardized account code with provider
   */
  private static generateAccountCode(
    module: string,
    branchCode: string,
    mappingType: string,
    provider?: string | null
  ): string {
    const modulePrefix = module.toUpperCase();
    const providerSuffix = provider
      ? `-${provider.toUpperCase().replace(/\s+/g, "")}`
      : "";
    const mappingSuffix =
      mappingType === "main" ? "" : `-${mappingType.toUpperCase()}`;

    return `${modulePrefix}-${branchCode}${providerSuffix}${mappingSuffix}`;
  }

  /**
   * Generate standardized account name with provider
   */
  private static generateAccountName(
    module: string,
    mappingType: string,
    accountType: string,
    provider?: string | null
  ): string {
    const moduleName = module.charAt(0).toUpperCase() + module.slice(1);
    const providerSuffix = provider ? ` - ${provider}` : "";

    switch (mappingType) {
      case "main":
        return `${moduleName} Float Account${providerSuffix}`;
      case "fee":
        return `${moduleName} Fee Account${providerSuffix}`;
      case "revenue":
        return `${moduleName} Revenue Account${providerSuffix}`;
      case "expense":
        return `${moduleName} Expense Account${providerSuffix}`;
      case "commission":
        return `${moduleName} Commission Account${providerSuffix}`;
      case "payment":
        return `${moduleName} Payment Account${providerSuffix}`;
      default:
        return `${moduleName} ${
          mappingType.charAt(0).toUpperCase() + mappingType.slice(1)
        } Account${providerSuffix}`;
    }
  }

  private static async generateExpenseAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    switch (mappingType) {
      case "expense":
        return {
          code: `EXP-${branchCode}-GEN`,
          name: "General Business Expenses",
          type: "Expense",
        };
      case "payment":
        // Map payment method to appropriate account with dynamic provider lookup
        if (transactionType.includes("cash")) {
          return {
            code: `CASH-${branchCode}`,
            name: "Cash in Till",
            type: "Asset",
          };
        } else if (transactionType.includes("momo")) {
          // Get the actual MoMo provider for this branch
          const momoProvider = await this.getPrimaryProvider("momo", branchId);
          const code = this.generateAccountCode(
            "momo",
            branchCode,
            "main",
            momoProvider
          );
          const name = this.generateAccountName(
            "momo",
            "main",
            "Asset",
            momoProvider
          );
          return {
            code,
            name,
            type: "Asset",
          };
        } else if (transactionType.includes("bank")) {
          // Get the actual Agency Banking provider for this branch
          const agbProvider = await this.getPrimaryProvider(
            "agency_banking",
            branchId
          );
          const code = this.generateAccountCode(
            "agency_banking",
            branchCode,
            "main",
            agbProvider
          );
          const name = this.generateAccountName(
            "agency_banking",
            "main",
            "Asset",
            agbProvider
          );
          return {
            code,
            name,
            type: "Asset",
          };
        } else {
          return {
            code: `CASH-${branchCode}`,
            name: "Cash in Till",
            type: "Asset",
          };
        }
      default:
        return {
          code: `EXP-${branchCode}-${mappingType.toUpperCase()}`,
          name: `${
            mappingType.charAt(0).toUpperCase() + mappingType.slice(1)
          } Account`,
          type: "Expense",
        };
    }
  }

  private static async generateMoMoAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    // Get the primary MoMo provider for this branch
    const provider = await this.getPrimaryProvider("momo", branchId);

    // For momo_float transaction type, create specific MoMo accounts
    if (transactionType === "momo_float") {
      const code = this.generateAccountCode(
        "momo",
        branchCode,
        mappingType,
        provider
      );
      const name = this.generateAccountName(
        "momo",
        mappingType,
        "Asset",
        provider
      );

      // Determine account type based on mapping type
      let accountType = "Asset";
      switch (mappingType) {
        case "main":
          accountType = "Asset";
          break;
        case "liability":
          accountType = "Liability";
          break;
        case "revenue":
          accountType = "Revenue";
          break;
        case "fee":
          accountType = "Revenue";
          break;
        case "expense":
          accountType = "Expense";
          break;
        default:
          accountType = "Asset";
      }

      return { code, name, type: accountType };
    }

    // For regular MoMo transactions, use the original logic
    const code = this.generateAccountCode(
      "momo",
      branchCode,
      mappingType,
      provider
    );
    const name = this.generateAccountName(
      "momo",
      mappingType,
      "Asset",
      provider
    );

    // Determine account type based on mapping type
    let accountType = "Asset";
    switch (mappingType) {
      case "revenue":
        accountType = "Revenue";
        break;
      case "expense":
        accountType = "Expense";
        break;
      case "fee":
        accountType = "Revenue";
        break;
      default:
        accountType = "Asset";
    }

    return { code, name, type: accountType };
  }

  private static async generateAgencyBankingAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    const provider = await this.getPrimaryProvider("agency_banking", branchId);

    // For agency_banking_float transaction type, create specific agency banking accounts
    if (transactionType === "agency_banking_float") {
      const code = this.generateAccountCode(
        "agency_banking",
        branchCode,
        mappingType,
        provider
      );
      const name = this.generateAccountName(
        "agency_banking",
        mappingType,
        "Asset",
        provider
      );

      // Determine account type based on mapping type
      let accountType = "Asset";
      switch (mappingType) {
        case "main":
          accountType = "Asset";
          break;
        case "liability":
          accountType = "Liability";
          break;
        case "revenue":
          accountType = "Revenue";
          break;
        case "fee":
          accountType = "Revenue";
          break;
        case "expense":
          accountType = "Expense";
          break;
        default:
          accountType = "Asset";
      }

      return { code, name, type: accountType };
    }

    // For regular agency banking transactions, use the original logic
    const code = this.generateAccountCode(
      "agency_banking",
      branchCode,
      mappingType,
      provider
    );
    const name = this.generateAccountName(
      "agency_banking",
      mappingType,
      "agency_banking",
      provider
    );

    switch (mappingType) {
      case "main":
        return {
          code: code,
          name: name,
          type: "Asset",
        };
      case "fee":
        return {
          code: code,
          name: name,
          type: "Asset",
        };
      case "revenue":
        return {
          code: code,
          name: name,
          type: "Revenue",
        };
      case "expense":
        return {
          code: code,
          name: name,
          type: "Expense",
        };
      default:
        return {
          code: code,
          name: name,
          type: "Asset",
        };
    }
  }

  private static async generateEzwichAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    const provider = await this.getPrimaryProvider("e_zwich", branchId);

    // For e_zwich_float transaction type, create specific E-Zwich accounts
    if (transactionType === "e_zwich_float") {
      const code = this.generateAccountCode(
        "e_zwich",
        branchCode,
        mappingType,
        provider
      );
      const name = this.generateAccountName(
        "e_zwich",
        mappingType,
        "Asset",
        provider
      );

      // Determine account type based on mapping type
      let accountType = "Asset";
      switch (mappingType) {
        case "main":
          accountType = "Asset";
          break;
        case "liability":
          accountType = "Liability";
          break;
        case "revenue":
          accountType = "Revenue";
          break;
        case "fee":
          accountType = "Revenue";
          break;
        case "expense":
          accountType = "Expense";
          break;
        default:
          accountType = "Asset";
      }

      return { code, name, type: accountType };
    }

    // For regular E-Zwich transactions, use the original logic
    const code = this.generateAccountCode(
      "e_zwich",
      branchCode,
      mappingType,
      provider
    );
    const name = this.generateAccountName(
      "e_zwich",
      mappingType,
      "e_zwich",
      provider
    );

    switch (mappingType) {
      case "main":
        return {
          code: code,
          name: name,
          type: "Asset",
        };
      case "fee":
        return {
          code: code,
          name: name,
          type: "Asset",
        };
      case "revenue":
        return {
          code: code,
          name: name,
          type: "Revenue",
        };
      case "expense":
        return {
          code: code,
          name: name,
          type: "Expense",
        };
      default:
        return {
          code: code,
          name: name,
          type: "Asset",
        };
    }
  }

  private static async generatePowerAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    const provider = await this.getPrimaryProvider("power", branchId);

    // For power_float transaction type, create specific Power accounts
    if (transactionType === "power_float") {
      const code = this.generateAccountCode(
        "power",
        branchCode,
        mappingType,
        provider
      );
      const name = this.generateAccountName(
        "power",
        mappingType,
        "Asset",
        provider
      );

      // Determine account type based on mapping type
      let accountType = "Asset";
      switch (mappingType) {
        case "main":
          accountType = "Asset";
          break;
        case "revenue":
          accountType = "Revenue";
          break;
        case "fee":
          accountType = "Revenue";
          break;
        case "expense":
          accountType = "Expense";
          break;
        default:
          accountType = "Asset";
      }

      return { code, name, type: accountType };
    }

    // For regular Power transactions, use the original logic
    const code = this.generateAccountCode(
      "power",
      branchCode,
      mappingType,
      provider
    );
    const name = this.generateAccountName(
      "power",
      mappingType,
      "power",
      provider
    );

    switch (mappingType) {
      case "main":
        return {
          code: code,
          name: name,
          type: "Asset",
        };
      case "fee":
        return {
          code: code,
          name: name,
          type: "Asset",
        };
      case "revenue":
        return {
          code: code,
          name: name,
          type: "Revenue",
        };
      case "expense":
        return {
          code: code,
          name: name,
          type: "Expense",
        };
      default:
        return {
          code: code,
          name: name,
          type: "Asset",
        };
    }
  }

  private static async generateJumiaAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    const provider = await this.getPrimaryProvider("jumia", branchId);

    // For jumia_float transaction type, create specific Jumia accounts
    if (transactionType === "jumia_float") {
      const code = this.generateAccountCode(
        "jumia",
        branchCode,
        mappingType,
        provider
      );
      const name = this.generateAccountName(
        "jumia",
        mappingType,
        "Asset",
        provider
      );

      // Determine account type based on mapping type
      let accountType = "Asset";
      switch (mappingType) {
        case "main":
          accountType = "Asset";
          break;
        case "liability":
          accountType = "Liability";
          break;
        case "revenue":
          accountType = "Revenue";
          break;
        case "fee":
          accountType = "Revenue";
          break;
        case "expense":
          accountType = "Expense";
          break;
        default:
          accountType = "Asset";
      }

      return { code, name, type: accountType };
    }

    // For regular Jumia transactions, use the original logic
    const code = this.generateAccountCode(
      "jumia",
      branchCode,
      mappingType,
      provider
    );
    const name = this.generateAccountName(
      "jumia",
      mappingType,
      "jumia",
      provider
    );

    // Determine account type based on mapping type
    let accountType = "Asset";
    switch (mappingType) {
      case "revenue":
        accountType = "Revenue";
        break;
      case "expense":
        accountType = "Expense";
        break;
      case "fee":
        accountType = "Revenue";
        break;
      default:
        accountType = "Asset";
    }

    return { code, name, type: accountType };
  }

  private static async generateCommissionAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    // For commissions, we don't need a specific provider, but we can use the transaction type
    const code = this.generateAccountCode(
      "commission",
      branchCode,
      mappingType,
      null
    );
    const name = this.generateAccountName(
      "commission",
      mappingType,
      "commission",
      null
    );

    // Determine account type based on mapping type
    let accountType = "Asset";
    switch (mappingType) {
      case "commission":
        accountType = "Revenue";
        break;
      case "revenue":
        accountType = "Revenue";
        break;
      default:
        accountType = "Asset";
    }

    return { code, name, type: accountType };
  }

  private static async generateFloatTransferAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    // For float transfers, we don't need a specific provider
    const code = this.generateAccountCode(
      "float_transfer",
      branchCode,
      mappingType,
      null
    );
    const name = this.generateAccountName(
      "float_transfer",
      mappingType,
      "float_transfer",
      null
    );

    // Determine account type based on mapping type
    let accountType = "Asset";
    switch (mappingType) {
      case "source":
        accountType = "Asset";
        break;
      case "destination":
        accountType = "Asset";
        break;
      case "fee":
        accountType = "Expense";
        break;
      case "revenue":
        accountType = "Revenue";
        break;
      default:
        accountType = "Asset";
    }

    return { code, name, type: accountType };
  }

  private static async generateCashTillAccountDetails(
    transactionType: string,
    mappingType: string,
    branchCode: string,
    branchId: string
  ): Promise<{ code: string; name: string; type: string }> {
    // For cash till, we don't need a specific provider
    const code = this.generateAccountCode(
      "cash_till",
      branchCode,
      mappingType,
      null
    );
    const name = this.generateAccountName(
      "cash_till",
      mappingType,
      "cash_till",
      null
    );

    // Determine account type based on mapping type
    let accountType = "Asset";
    switch (mappingType) {
      case "main":
        accountType = "Asset";
        break;
      case "revenue":
        accountType = "Revenue";
        break;
      case "expense":
        accountType = "Expense";
        break;
      default:
        accountType = "Asset";
    }

    return { code, name, type: accountType };
  }

  private static generateDefaultAccountDetails(
    sourceModule: string,
    transactionType: string,
    mappingType: string,
    branchCode: string
  ): { code: string; name: string; type: string } {
    return {
      code: `${sourceModule.toUpperCase()}-${branchCode}-${mappingType.toUpperCase()}`,
      name: `${sourceModule.charAt(0).toUpperCase() + sourceModule.slice(1)} ${
        mappingType.charAt(0).toUpperCase() + mappingType.slice(1)
      }`,
      type:
        mappingType === "revenue"
          ? "Revenue"
          : mappingType === "expense"
          ? "Expense"
          : "Asset",
    };
  }
}
