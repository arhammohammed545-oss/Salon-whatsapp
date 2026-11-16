"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Service = { id:string; name:string; duration_minutes:number; price:number|null; is_active:boolean };

export default function ServiceManager({businessId, initialServices}:{businessId:string;initialServices:Service[]}) {
  const [services,setServices]=useState(initialServices);
  const [showForm,setShowForm]=useState(false);
  const [name,setName]=useState("");
  const [duration,setDuration]=useState("30");
  const [price,setPrice]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function addService(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const supabase=createClient();
      const {data,error}=await supabase.from("services").insert({
        business_id:businessId,name:name.trim(),duration_minutes:Number(duration),
        price:price.trim()===""?null:Number(price),is_active:true
      }).select("id,name,duration_minutes,price,is_active").single();
      if(error) throw error;
      setServices(current=>[data as Service,...current]);
      setName("");setDuration("30");setPrice("");setShowForm(false);setMessage("Service saved.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Could not save service."); }
    finally { setBusy(false); }
  }

  async function toggleActive(service:Service) {
    setMessage("");
    const supabase=createClient();
    const {error}=await supabase.from("services").update({is_active:!service.is_active}).eq("id",service.id).eq("business_id",businessId);
    if(error){setMessage(error.message);return;}
    setServices(current=>current.map(s=>s.id===service.id?{...s,is_active:!s.is_active}:s));
  }

  return <>
    <section className="customer-toolbar"><div className="customer-search"><span>✂</span><input aria-label="Services summary" disabled value={services.length+" services configured"} /></div><button className="primary-button" type="button" onClick={()=>setShowForm(v=>!v)}>{showForm?"Close":"＋ Add service"}</button></section>
    {showForm&&<form className="customer-form panel" onSubmit={addService}>
      <div className="form-heading"><h2>Add a salon service</h2><p>Set the service name, appointment duration and price in INR.</p></div>
      <div className="customer-fields">
        <label>Service name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Haircut" /></label>
        <label>Duration (minutes)<input required type="number" min="5" max="600" step="5" value={duration} onChange={e=>setDuration(e.target.value)} /></label>
        <label>Price (₹)<input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Optional" /></label>
      </div>
      {message&&<p className="customer-feedback" role="status">{message}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy?"Saving…":"Save service"}</button>
    </form>}
    {!showForm&&message&&<p className="customer-feedback" role="status">{message}</p>}
    <section className="panel customer-table-panel">
      <div className="customer-table-heading"><div><h2>Service menu</h2><p>{services.length} services · Prices shown in Indian rupees</p></div></div>
      {services.length===0?<div className="customer-list-empty"><span>✂</span><strong>No services added yet</strong><p>Add services before creating appointments.</p></div>:
      <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Service</th><th>Duration</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>{services.map(s=><tr key={s.id}><td><strong>{s.name}</strong></td><td>{s.duration_minutes} min</td><td>{s.price===null?"Not set":"₹"+Number(s.price).toLocaleString("en-IN")}</td><td><span className={s.is_active?"consent-yes":"consent-no"}>{s.is_active?"Active":"Inactive"}</span></td><td><button className="table-action" type="button" onClick={()=>toggleActive(s)}>{s.is_active?"Deactivate":"Activate"}</button></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
