import { createClient } from "@/lib/supabase/server";
import AvailabilityManager from "./availability-manager";

const navItems=[
  ["Overview","⌂","/"],["Customers","♙","/customers"],["Appointments","▦","/appointments"],
  ["Availability","◷","/availability"],["Services","✂","/services"],["Campaigns","✉","/campaigns"],
  ["Message templates","▤","/templates"],["Reminders","◷","/reminders"]
] as const;

export default async function AvailabilityPage(){
  const supabase=await createClient();
  const {data:authData}=await supabase.auth.getClaims();
  const userId=authData?.claims?.sub;
  if(!userId)return null;
  const {data:membership}=await supabase.from("business_members").select("business_id").eq("user_id",userId).limit(1).maybeSingle();
  if(!membership)return <main className="login-shell"><section className="login-card"><h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p><form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form></section></main>;
  const {data:business}=await supabase.from("businesses").select("id,name,timezone").eq("id",membership.business_id).maybeSingle();
  if(!business)return null;
  const [{data:hours},{data:closures}]=await Promise.all([
    supabase.from("salon_business_hours").select("day_of_week,is_closed,opens_at,closes_at,break_starts_at,break_ends_at").eq("business_id",business.id).order("day_of_week"),
    supabase.from("salon_closures").select("id,closed_on,reason").eq("business_id",business.id).gte("closed_on",new Date().toISOString().slice(0,10)).order("closed_on").limit(100)
  ]);
  return <main className="shell"><aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label,icon,href])=><a className={label==="Availability"?"nav-link active":"nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>Control your schedule</strong><p>Set weekly hours and add special closed dates.</p><span>Glowdesk setup guide ↗</span></div></div></aside><section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Availability</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header><div className="content"><div className="welcome-row"><div><p className="eyebrow">BOOKING SETTINGS</p><h1>Availability</h1><p className="subhead">Manage when {business.name} accepts appointments.</p></div><span className="date-pill">{business.timezone==="Asia/Kolkata"?"India · IST":business.timezone}</span></div><AvailabilityManager businessId={business.id} initialHours={hours??[]} initialClosures={closures??[]}/><footer>Glowdesk · {business.name}<span>Availability settings are saved to the salon workspace.</span></footer></div></section></main>;
}
