import { createClient } from "@/lib/supabase/server";
import TemplateManager from "./template-manager";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"],
  ["Services", "✂", "/services"], ["Campaigns", "✉", "#"], ["Message templates", "▤", "/templates"],
  ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) return null;
  const { data: membership } = await supabase.from("business_members").select("business_id").eq("user_id", userId).limit(1).maybeSingle();
  if (!membership) return <main className="login-shell"><section className="login-card"><h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p><form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form></section></main>;
  const [{ data: business }, { data: templates }] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("id", membership.business_id).maybeSingle(),
    supabase.from("message_templates").select("id,name,category,language,body,status,created_at").eq("business_id", membership.business_id).order("created_at", { ascending: false })
  ]);
  if (!business) return null;
  return <main className="shell">
    <aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label,icon,href])=><a className={label==="Message templates"?"nav-link active":"nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>Reusable customer messages</strong><p>Prepare clear, consistent messages for your salon team.</p><span>Glowdesk setup guide ↗</span></div></div></aside>
    <section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Message templates</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header>
      <div className="content"><div className="welcome-row"><div><p className="eyebrow">WHATSAPP MESSAGING</p><h1>Message templates</h1><p className="subhead">Create reusable messages for {business.name}.</p></div><span className="date-pill">{business.name}</span></div>
        <div className="template-info panel"><strong>Before a template can be sent</strong><p>Business-initiated WhatsApp messages may require an approved Meta template. Save your draft here, then submit and manage approval in WhatsApp Manager. Saving a draft never sends a message.</p></div>
        <TemplateManager businessId={business.id} initialTemplates={templates??[]} />
        <footer>Glowdesk · {business.name}<span>Only Meta-approved templates can be used for eligible outbound messages.</span></footer>
      </div>
    </section>
  </main>;
}
