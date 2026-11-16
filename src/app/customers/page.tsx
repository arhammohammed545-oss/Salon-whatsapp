import CustomerManager from "./customer-manager";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"], ["Availability", "◷", "/availability"],
  ["Services", "✂", "/services"],
  ["Campaigns", "✉", "/campaigns"], ["Message templates", "▤", "/templates"], ["Reminders", "◷", "/reminders"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="login-shell"><section className="login-card">
        <a className="brand login-brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a>
        <p className="eyebrow">KITH AND KIN · OWNER ACCESS</p><h1>Workspace access pending</h1>
        <p className="login-subtitle">Your account is signed in, but it has not yet been linked to the Kith and Kin workspace. Ask the administrator to grant your owner access.</p>
        <form action="/auth/signout" method="post"><button className="login-submit" type="submit">Sign out</button></form>
      </section></main>
    );
  }

  const [{ data: business }, { data: customers }] = await Promise.all([
    supabase.from("businesses").select("id, name").eq("id", membership.business_id).maybeSingle(),
    supabase.from("customers").select("id, full_name, phone_e164, whatsapp_opt_in, opt_in_at, opt_in_source, opted_out_at, notes, created_at")
      .eq("business_id", membership.business_id).order("created_at", { ascending: false }),
  ]);

  if (!business) return null;

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{navItems.map(([label, icon, href]) => <a className={label === "Customers" ? "nav-link active" : "nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><strong>Customer care, made simple</strong><p>Keep customer details organised and respect each person's messaging preferences.</p><span>Glowdesk setup guide ↗</span></div><div className="profile"><div className="avatar">S</div><div><strong>Salon owner</strong><small>Administrator</small></div><span className="dots">•••</span></div></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Customers</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span><div className="avatar small">S</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow">CUSTOMER RELATIONSHIPS</p><h1>Customers</h1><p className="subhead">A clear view of the people who make {business.name} special.</p></div><span className="date-pill">{business.name}</span></div>
          <CustomerManager businessId={business.id} initialCustomers={customers ?? []} />
          <footer>Glowdesk · {business.name} <span>Customer information stays private to the salon.</span></footer>
        </div>
      </section>
    </main>
  );
}
