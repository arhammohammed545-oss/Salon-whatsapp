import { createClient } from "@/lib/supabase/server";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"], ["Availability", "◷", "/availability"],
  ["Services", "✂", "/services"], ["Inbox", "☷", "/inbox"], ["Campaigns", "✉", "/campaigns"],
  ["Message templates", "▤", "/templates"], ["Reminders", "◷", "/reminders"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

type MessageLog = {
  id: string;
  customer_id: string | null;
  direction: "inbound" | "outbound";
  message_type: string;
  template_name: string | null;
  status: string;
  error_code: string | null;
  created_at: string;
};

type Customer = { id: string; full_name: string; phone_e164: string };

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return null;

  const { data: membership } = await supabase.from("business_members")
    .select("business_id").eq("user_id", userId).limit(1).maybeSingle();

  if (!membership) return <main className="login-shell"><section className="login-card">
    <h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p>
    <form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form>
  </section></main>;

  const [{ data: business }, { data: logs }, { data: customers }] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("id", membership.business_id).maybeSingle(),
    supabase.from("message_logs").select("id,customer_id,direction,message_type,template_name,status,error_code,created_at")
      .eq("business_id", membership.business_id).order("created_at", { ascending: false }).limit(100),
    supabase.from("customers").select("id,full_name,phone_e164").eq("business_id", membership.business_id)
  ]);
  if (!business) return null;

  const customerById = new Map((customers ?? []).map((customer: Customer) => [customer.id, customer]));
  const messages = (logs ?? []) as MessageLog[];

  return <main className="shell">
    <aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a>
      <div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label, icon, href]) =>
        <a className={label === "Inbox" ? "nav-link active" : "nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><strong>Customer conversations</strong><p>Review inbound replies and delivery updates received through the official WhatsApp webhook.</p><span>Glowdesk workspace</span></div></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Inbox</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header>
      <div className="content"><div className="welcome-row"><div><p className="eyebrow">CUSTOMER COMMUNICATION</p><h1>Message activity</h1><p className="subhead">Inbound messages and WhatsApp delivery updates for {business.name}.</p></div><span className="date-pill">{messages.length} recent records</span></div>
        <div className="template-info panel"><strong>Conversation content is not stored yet</strong><p>This view currently shows message type, customer association and delivery status. Message text and media previews are not captured. No replies are sent from this inbox.</p></div>
        <section className="panel customer-table-panel"><div className="customer-table-heading"><div><h2>Recent messages</h2><p>Latest 100 message events · newest first</p></div></div>
          {messages.length === 0 ? <div className="customer-list-empty"><span>☷</span><strong>No message activity yet</strong><p>Once the official WhatsApp Cloud API is connected, inbound messages and delivery updates will appear here.</p></div> :
          <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Direction</th><th>Type</th><th>Status</th><th>Date</th></tr></thead><tbody>
            {messages.map(message => { const customer = message.customer_id ? customerById.get(message.customer_id) : undefined; return <tr key={message.id}>
              <td><strong>{customer?.full_name ?? "Unknown customer"}</strong><br/><small>{customer?.phone_e164 ?? "Contact not matched"}</small></td>
              <td>{message.direction === "inbound" ? "Received" : "Sent"}</td><td>{message.template_name ?? message.message_type}</td>
              <td><span className={message.status === "failed" ? "consent-no" : "consent-yes"}>{message.status}</span>{message.error_code ? <small> · {message.error_code}</small> : null}</td>
              <td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(message.created_at))}</td>
            </tr>; })}
          </tbody></table></div>}
        </section><footer>Glowdesk · {business.name}<span>Message activity is private to this salon workspace.</span></footer>
      </div>
    </section>
  </main>;
}
