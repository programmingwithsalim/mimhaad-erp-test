import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.CONNECTION_STRING!);

export async function GET() {
  try {
    const configs = await sql`
      SELECT config_key, config_value, updated_at
      FROM system_config 
      WHERE config_key LIKE 'email_%'
        OR config_key LIKE 'resend_%'
        OR config_key LIKE 'smtp_%'
        OR config_key LIKE 'sms_%'
        OR config_key LIKE '%_sms_api_key'
        OR config_key LIKE '%_sms_api_secret'
        OR config_key LIKE '%_sms_sender_id'
        OR config_key LIKE '%_sms_webhook_url'
        OR config_key LIKE '%_sms_test_mode'
      ORDER BY config_key
    `;

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error("Error fetching communications config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch communications configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { configs, userId } = await request.json();

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { success: false, error: "Invalid configuration data" },
        { status: 400 }
      );
    }

    // Find the SMS provider and its config values
    const smsProviderConfig = configs.find(
      (c) => c.config_key === "sms_provider"
    );
    const smsProvider = smsProviderConfig?.config_value;
    const smsFields = [
      "sms_api_key",
      "sms_api_secret",
      "sms_sender_id",
      "sms_webhook_url",
      "sms_test_mode",
    ];
    const smsValues: Record<string, string> = {};
    for (const field of smsFields) {
      const config = configs.find(
        (c) =>
          c.config_key === `${smsProvider}_${field}` || c.config_key === field
      );
      if (config) {
        smsValues[field] = config.config_value;
      }
    }

    // For each SMS field, add both generic and provider-specific configs
    const extendedConfigs = [...configs];
    if (smsProvider) {
      for (const field of smsFields) {
        const providerKey = `${smsProvider}_${field}`;
        const genericKey = field;
        const value = smsValues[field] ?? "";
        // Add/replace provider-specific config
        if (!extendedConfigs.some((c) => c.config_key === providerKey)) {
          extendedConfigs.push({
            config_key: providerKey,
            config_value: value,
          });
        }
        // Add/replace generic config
        if (!extendedConfigs.some((c) => c.config_key === genericKey)) {
          extendedConfigs.push({ config_key: genericKey, config_value: value });
        }
      }
    }

    // Update or insert each configuration
    for (const config of extendedConfigs) {
      const { config_key, config_value } = config;
      await sql`
        INSERT INTO system_config (config_key, config_value, updated_by, updated_at)
        VALUES (${config_key}, ${config_value}, ${userId || 1}, NOW())
        ON CONFLICT (config_key) 
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Communications configuration updated successfully",
    });
  } catch (error) {
    console.error("Error updating communications config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update communications configuration",
      },
      { status: 500 }
    );
  }
}
