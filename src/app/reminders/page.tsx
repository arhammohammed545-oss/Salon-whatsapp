import { createClient } from "@/lib/supabase/server";
import ReminderCenter from "./reminder-center";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"],
  ["Services", "✂", "/services"], ["Campaigns", "✉", "/campaigns"], ["Message templates", "▤", "/templates"],
  ["Reminders", "◷", "/reminders"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default async function RemindersPage() {
  const supabase=await createClient();
  const {data:authData}=await supabase.auth.getClaims();
  const userId=authData?.claims?.sub;
  if(!userId)return null;
  const {data:membership}=await supabase.from("business_members").select("business_id").eq("user_id",userId).limit(1).maybeSingle();
  if(!membership)return <main className="login-shell"><section className="login-card"><h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p><form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form></section></main>;
  const {data:business}=await supabase.from("businesses").select("id,name,whatsapp_phone_number_id,whatsapp_business_account_id").eq("id",membership.business_id).maybeSingle();
  if(!business)return null;
  const now=new Date();
  const horizon=new Date(now.getTime()+7*24*60*60*1000);
  const [{data:rawAppointments},{data:templates}]=await Promise.all([
    supabase.from("appointments").select("id,customer_id,service_name,starts_at,status").eq("business_id",business.id).in("status",["booked","confirmed"]).gte("starts_at",now.toISOString()).lte("starts_at",horizon.toISOString()).order("starts_at"),
    supabase.from("message_templates").select("id,name,category,status").eq("business_id",business.id).eq("category","UTILITY").eq("status","approved")
  ]);
  const customerIds=[...new Set((rawAppointments??[]).map(a=>a.customer_id))];
  const {data:customers}=customerIds.length?await supabase.from("customers").select("id,full_name,phone_e164,whatsapp_opt_in,opted_out_at").in("id",customerIds):{data:[]};
  const customerMap=new Map((customers??[]).map(c=>[c.id,c]));
  const appointments=(rawAppointments??[]).map(a=>({...a,customer:customerMap.get(a.customer_id)??null}));
  return <main className="shell"><aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label,icon,href])=><a className={label==="Reminders"?"nav-link active":"nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>Thoughtful reminders</strong><p>Keep customers informed about upcoming bookings.</p><span>Glowdesk setup guide ↗</span></div></div></aside><section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Reminders</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header><div className="content"><div className="welcome-row"><div><p className="eyebrow">CUSTOMER COMMUNICATION</p><h1>Appointment reminders</h1><p className="subhead">Review upcoming bookings and check reminder readiness.</p></div><span className="date-pill">Next 7 days</span></div><div className="template-info panel"><strong>Safe sending is not enabled yet</strong><p>This page is a readiness preview only. No WhatsApp messages are sent. Automated reminders will require a connected Meta WhatsApp Cloud API number, an approved Utility template and each customer’s recorded opt-in. Opted-out customers are excluded.</p></div><ReminderCenter appointments={appointments} approvedTemplateCount={templates?.length??0} whatsappConnected={Boolean(business.whatsapp_phone_number_id&&business.whatsapp_business_account_id)} /></div></section></main>;
}
