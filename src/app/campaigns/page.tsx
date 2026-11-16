import { createClient } from "@/lib/supabase/server";
import CampaignManager from "./campaign-manager";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"],
  ["Services", "✂", "/services"], ["Campaigns", "✉", "/campaigns"], ["Message templates", "▤", "/templates"],
  ["Reminders", "◷", "/reminders"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default async function CampaignsPage() {
  const supabase=await createClient();
  const {data:authData}=await supabase.auth.getClaims();
  const userId=authData?.claims?.sub;
  if(!userId)return null;
  const {data:membership}=await supabase.from("business_members").select("business_id").eq("user_id",userId).limit(1).maybeSingle();
  if(!membership)return <main className="login-shell"><section className="login-card"><h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p><form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form></section></main>;

  const [{data:business},{data:templates},{data:campaigns},{data:eligibleCustomers}] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("id",membership.business_id).maybeSingle(),
    supabase.from("message_templates").select("id,name,body,language,category").eq("business_id",membership.business_id).eq("category","MARKETING").eq("status","approved").order("created_at",{ascending:false}),
    supabase.from("campaigns").select("id,name,template_name,status,scheduled_at,created_at").eq("business_id",membership.business_id).order("created_at",{ascending:false}),
    supabase.from("customers").select("id").eq("business_id",membership.business_id).eq("whatsapp_opt_in",true).is("opted_out_at",null)
  ]);
  if(!business)return null;
  return <main className="shell">
    <aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label,icon,href])=><a className={label==="Campaigns"?"nav-link active":"nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>Thoughtful promotions</strong><p>Plan offers for customers who have agreed to receive WhatsApp messages.</p><span>Glowdesk setup guide ↗</span></div></div></aside>
    <section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Campaigns</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header>
      <div className="content"><div className="welcome-row"><div><p className="eyebrow">CUSTOMER ENGAGEMENT</p><h1>Campaigns</h1><p className="subhead">Prepare consent-based promotions for {business.name}.</p></div><span className="date-pill">{business.name}</span></div>
        <div className="template-info panel"><strong>Campaign sending is not enabled</strong><p>Glowdesk currently saves campaign drafts only. No messages are sent or scheduled. Sending will require Meta Cloud API onboarding, approved Marketing templates, customer consent, opt-out checks and a secure sending workflow.</p></div>
        <CampaignManager businessId={business.id} initialTemplates={templates??[]} initialCampaigns={campaigns??[]} eligibleAudienceCount={eligibleCustomers?.length??0}/>
        <footer>Glowdesk · {business.name}<span>Promotional messages must respect customer consent and opt-outs.</span></footer>
      </div>
    </section>
  </main>;
}
