import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetaMessage = {
  id?: string;
  from?: string;
  type?: string;
  timestamp?: string;
};
type MetaStatus = {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number | string }>;
};
type MetaValue = {
  metadata?: { phone_number_id?: string };
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
};
type MetaPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{ field?: string; value?: MetaValue }>;
  }>;
};

function validSignature(rawBody: string, signature: string, appSecret: string) {
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

  if (!appSecret || !supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!validSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: MetaPayload;
  try {
    payload = JSON.parse(rawBody) as MetaPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let processed = 0;
  let ignored = 0;
  const failures: string[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) {
        ignored += (value.messages?.length ?? 0) + (value.statuses?.length ?? 0);
        continue;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();

      if (businessError || !business) {
        failures.push("business_lookup_failed");
        continue;
      }

      for (const message of value.messages ?? []) {
        if (!message.id) {
          ignored += 1;
          continue;
        }
        const eventKey = `message:${message.id}`;
        const eventPayload = { field: change.field ?? "messages", message };
        const { error: eventError } = await supabase
          .from("webhook_events")
          .upsert({
            business_id: business.id,
            event_type: "message_received",
            meta_event_id: eventKey,
            payload: eventPayload,
            processed_at: new Date().toISOString(),
          }, { onConflict: "meta_event_id", ignoreDuplicates: true });

        if (eventError) {
          failures.push("message_event_persist_failed");
          continue;
        }

        const from = message.from?.replace(/[^0-9]/g, "");
        let customerId: string | null = null;
        if (from) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("business_id", business.id)
            .eq("phone_e164", `+${from}`)
            .maybeSingle();
          customerId = customer?.id ?? null;
        }

        const { error: logError } = await supabase
          .from("message_logs")
          .upsert({
            business_id: business.id,
            customer_id: customerId,
            direction: "inbound",
            message_type: message.type ?? "unknown",
            meta_message_id: message.id,
            status: "received",
          }, { onConflict: "meta_message_id", ignoreDuplicates: true });

        if (logError) {
          failures.push("inbound_message_log_failed");
          continue;
        }
        processed += 1;
      }

      for (const statusEvent of value.statuses ?? []) {
        if (!statusEvent.id || !statusEvent.status) {
          ignored += 1;
          continue;
        }
        const status = ["sent", "delivered", "read", "failed"].includes(statusEvent.status)
          ? statusEvent.status
          : null;
        const eventKey = `status:${statusEvent.id}:${statusEvent.status}`;
        const { error: eventError } = await supabase
          .from("webhook_events")
          .upsert({
            business_id: business.id,
            event_type: `message_${statusEvent.status}`,
            meta_event_id: eventKey,
            payload: { field: change.field ?? "messages", status: statusEvent },
            processed_at: new Date().toISOString(),
          }, { onConflict: "meta_event_id", ignoreDuplicates: true });

        if (eventError) {
          failures.push("status_event_persist_failed");
          continue;
        }

        if (status) {
          const { error: updateError } = await supabase
            .from("message_logs")
            .update({
              status,
              error_code: statusEvent.errors?.[0]?.code
                ? String(statusEvent.errors[0].code)
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq("business_id", business.id)
            .eq("meta_message_id", statusEvent.id);

          if (updateError) {
            failures.push("message_status_update_failed");
            continue;
          }
        }
        processed += 1;
      }
    }
  }

  if (failures.length) {
    // Meta may retry failed deliveries; event keys make successful writes idempotent.
    return NextResponse.json({ received: true, processed, ignored, errors: failures }, { status: 500 });
  }

  return NextResponse.json({ received: true, processed, ignored });
}
