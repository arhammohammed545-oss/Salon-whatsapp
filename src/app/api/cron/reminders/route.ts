import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return jsonError("Cron endpoint is not configured.", 503);

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${cronSecret}`) {
    return jsonError("Unauthorized.", 401);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return jsonError("Server-side database configuration is missing.", 503);
  }

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date().toISOString();
  const { data: dueRows, error: queueError } = await supabase
    .from("reminder_queue")
    .select("id,business_id,appointment_id,customer_id,template_name,scheduled_for")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (queueError) return jsonError("Could not read the reminder queue.", 500);

  let cancelled = 0;
  let eligibleForFutureDispatch = 0;
  let blockedByConnection = 0;
  const results: Array<{ id: string; outcome: string }> = [];

  for (const item of dueRows ?? []) {
    const [appointmentResult, customerResult, businessResult, templateResult] =
      await Promise.all([
        supabase
          .from("appointments")
          .select("id,business_id,customer_id,status,starts_at")
          .eq("id", item.appointment_id)
          .eq("business_id", item.business_id)
          .maybeSingle(),
        supabase
          .from("customers")
          .select("id,business_id,whatsapp_opt_in,opted_out_at")
          .eq("id", item.customer_id)
          .eq("business_id", item.business_id)
          .maybeSingle(),
        supabase
          .from("businesses")
          .select("id,whatsapp_phone_number_id,whatsapp_business_account_id")
          .eq("id", item.business_id)
          .maybeSingle(),
        supabase
          .from("message_templates")
          .select("id,name,meta_template_name,category,status")
          .eq("business_id", item.business_id)
          .eq("category", "UTILITY")
          .eq("status", "approved")
          .or(`name.eq.${item.template_name},meta_template_name.eq.${item.template_name}`)
          .limit(1)
          .maybeSingle(),
      ]);

    if (
      appointmentResult.error ||
      customerResult.error ||
      businessResult.error ||
      templateResult.error
    ) {
      results.push({ id: item.id, outcome: "validation_error" });
      continue;
    }

    const appointment = appointmentResult.data;
    const customer = customerResult.data;
    const invalidReason =
      !appointment || !["booked", "confirmed"].includes(appointment.status)
        ? "appointment_not_active"
        : !customer || !customer.whatsapp_opt_in || customer.opted_out_at
          ? "customer_consent_missing_or_revoked"
          : !templateResult.data
            ? "approved_utility_template_missing"
            : null;

    if (invalidReason) {
      const { error: updateError } = await supabase
        .from("reminder_queue")
        .update({
          status: "cancelled",
          last_error: invalidReason,
          updated_at: now,
        })
        .eq("id", item.id)
        .eq("status", "pending");

      if (updateError) {
        results.push({ id: item.id, outcome: "cancel_update_failed" });
      } else {
        cancelled += 1;
        results.push({ id: item.id, outcome: invalidReason });
      }
      continue;
    }

    const business = businessResult.data;
    const connectionReady = Boolean(
      business?.whatsapp_phone_number_id &&
      business?.whatsapp_business_account_id &&
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_API_VERSION
    );

    if (!connectionReady) {
      blockedByConnection += 1;
      results.push({ id: item.id, outcome: "waiting_for_whatsapp_connection" });
      continue;
    }

    // Safety: this endpoint is validation-only. It never calls Meta or marks a message as sent.
    eligibleForFutureDispatch += 1;
    results.push({ id: item.id, outcome: "eligible_dry_run_only" });
  }

  return NextResponse.json({
    ok: true,
    dryRun: true,
    messagesSent: 0,
    checked: dueRows?.length ?? 0,
    cancelled,
    eligibleForFutureDispatch,
    blockedByConnection,
    results,
    note: "Validation only. WhatsApp sending is not implemented or enabled.",
  });
}
