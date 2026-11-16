import { createClient } from "@/lib/supabase/server";
import ServiceManager from "./service-manager";

const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "/appointments"],
  ["Services", "✂", "/services"], ["Campaigns", "✉", "#"], ["Message templates", "▤", "#"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default async function ServicesPage() {
  const supabase=await createClient();
  const {data:authData}=await supabase.auth.getClaims();
  const userId=authData?.claims?.sub;
  if(!userId)return null;
  const {data:membership}=await supabase.from("business_members").select("business_id").eq("user_id",userId).limit(1).maybeSingle();
  if(!membership)return <main className="login-shell"><section className="login-card"><h1>Workspace access pending</h1><p className="login-subtitle">Ask the administrator to link your account to Kith and Kin.</p><form action="/auth/signout" method="post"><button className="login-submit">Sign out</button></form></section></main>;
  const {data:business}=await supabase.from("businesses").select("id,name").eq("id",membership.business_id).maybeSingle();
  if(!business)return null;
  const {data:services}=await supabase.from("services").select("id,name,duration_minutes,price,is_active").eq("business_id",business.id).order("created_at",{ascending:false});
  return <main className="shell"><aside className="sidebar"><a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(([label,icon,href])=><a className={label==="Services"?"nav-link active":"nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>Your salon menu</strong><p>Keep service names, durations and prices up to date.</p><span>Glowdesk setup guide ↗</span></div></div></aside><section className="main-area"><header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Services</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span></div></header><div className="content"><div className="welcome-row"><div><p className="eyebrow">SALON MENU</p><h1>Services</h1><p className="subhead">Manage the treatments and services offered by {business.name}.</p></div><span className="date-pill">{business.name}</span></div><ServiceManager businessId={business.id} initialServices={services??[]} /><footer>Glowdesk · {business.name}<span>Prices shown in Indian rupees.</span></footer></div></section></main>;
}
