import { createClient } from "@/lib/supabase/server";
import AppointmentManager from "./appointment-manager";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"],
  ["Services", "✂", "/services"], ["Campaigns", "✉", "#"], ["Message templates", "▤", "/templates"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default async function AppointmentsPage() {
  const supabase=await createClient();
  const {data:authData}=await supabase.auth.getClaims();
  const userId=authData?.claims?.sub;
  if(!userId)return null;
  const {data:membership}=await supabase.from("business_members").select("business_id").eq("user_id",userId).limit(1).maybeSingle();
  if(!membership)return <main className="login-shell"><section className="login-card"><h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p><form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form></section></main>;
  const {data:business}=await supabase.from("businesses").select("id,name").eq("id",membership.business_id).maybeSingle();
  if(!business)return null;
  const [{data:customers},{data:services},{data:rawAppointments}]=await Promise.all([
    supabase.from("customers").select("id,full_name,phone_e164").eq("business_id",business.id).order("full_name"),
    supabase.from("services").select("id,name,duration_minutes,price").eq("business_id",business.id).eq("is_active",true).order("name"),
    supabase.from("appointments").select("id,customer_id,service_name,starts_at,ends_at,status,notes").eq("business_id",business.id).order("starts_at",{ascending:false}).limit(100)
  ]);
  const customerMap=new Map((customers??[]).map(c=>[c.id,c]));
  const appointments=(rawAppointments??[]).map(a=>({...a,customer:customerMap.get(a.customer_id)??null}));
  return <main className="shell"><aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label,icon,href])=><a className={label==="Appointments"?"nav-link active":"nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>Keep the day organised</strong><p>Book services, track visits and update appointment status.</p><span>Glowdesk setup guide ↗</span></div></div></aside><section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Appointments</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header><div className="content"><div className="welcome-row"><div><p className="eyebrow">SALON SCHEDULE</p><h1>Appointments</h1><p className="subhead">Manage bookings for {business.name}.</p></div><span className="date-pill">India · IST</span></div><AppointmentManager businessId={business.id} customers={customers??[]} services={services??[]} initialAppointments={appointments} /><footer>Glowdesk · {business.name}<span>Bookings are stored in the salon workspace.</span></footer></div></section></main>;
}
