"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer={id:string;full_name:string;phone_e164:string};
type Service={id:string;name:string;duration_minutes:number;price:number|null};
type Appointment={id:string;customer_id:string;service_name:string;starts_at:string;ends_at:string|null;status:string;notes:string|null;customer?:Customer|null};

function salonDateTime(date:string,time:string){return new Date(date+"T"+time+":00+05:30");}
function displayDate(value:string){return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(value));}

export default function AppointmentManager({businessId,customers,services,initialAppointments}:{businessId:string;customers:Customer[];services:Service[];initialAppointments:Appointment[]}) {
  const [appointments,setAppointments]=useState(initialAppointments);
  const [showForm,setShowForm]=useState(false);
  const [customerId,setCustomerId]=useState(customers[0]?.id??"");
  const [serviceId,setServiceId]=useState(services.find(s=>s.id)?.id??"");
  const [date,setDate]=useState(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date()));
  const [time,setTime]=useState("10:00");
  const [notes,setNotes]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const activeServices=useMemo(()=>services.filter(s=>true),[services]);

  async function createAppointment(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage("");
    if(!customerId||!serviceId){setMessage("Add at least one customer and one active service first.");setBusy(false);return;}
    const customer=customers.find(c=>c.id===customerId);
    const service=services.find(s=>s.id===serviceId);
    if(!customer||!service){setMessage("Please select a valid customer and service.");setBusy(false);return;}
    const start=salonDateTime(date,time);
    if(Number.isNaN(start.getTime())||start.getTime()<=Date.now()){setMessage("Choose a future appointment date and time (India time).");setBusy(false);return;}
    const end=new Date(start.getTime()+service.duration_minutes*60000);
    try {
      const supabase=createClient();
      const {data:conflict,error:conflictError}=await supabase.from("appointments").select("id").eq("business_id",businessId).in("status",["booked","confirmed"]).lt("starts_at",end.toISOString()).gt("ends_at",start.toISOString()).limit(1);
      if(conflictError)throw conflictError;
      if(conflict&&conflict.length){setMessage("This time overlaps an existing appointment. Please choose another slot.");setBusy(false);return;}
      const {data,error}=await supabase.from("appointments").insert({
        business_id:businessId,customer_id:customer.id,service_id:service.id,service_name:service.name,
        starts_at:start.toISOString(),ends_at:end.toISOString(),status:"booked",notes:notes.trim()||null
      }).select("id,customer_id,service_name,starts_at,ends_at,status,notes").single();
      if(error)throw error;
      setAppointments(current=>[{...data as Appointment,customer},...current].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));
      setNotes("");setShowForm(false);setMessage("Appointment booked. No WhatsApp message has been sent.");
    } catch(e){setMessage(e instanceof Error?e.message:"Could not book this appointment.");}
    finally{setBusy(false);}
  }

  async function updateStatus(id:string,status:string){
    setMessage("");
    const supabase=createClient();
    const {error}=await supabase.from("appointments").update({status}).eq("id",id).eq("business_id",businessId);
    if(error){setMessage(error.message);return;}
    setAppointments(current=>current.map(a=>a.id===id?{...a,status}:a));
  }

  const sorted=[...appointments].sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  return <>
    <section className="customer-toolbar"><div className="customer-search"><span>▦</span><input aria-label="Appointments count" disabled value={appointments.length+" appointments"} /></div><button className="primary-button" type="button" onClick={()=>setShowForm(v=>!v)}>{showForm?"Close":"＋ Book appointment"}</button></section>
    {showForm&&<form className="customer-form panel" onSubmit={createAppointment}>
      <div className="form-heading"><h2>Book an appointment</h2><p>Appointment times are saved in India Standard Time (IST). This does not send a WhatsApp message.</p></div>
      {customers.length===0||activeServices.length===0?<div className="login-alert">You need at least one customer and one active service before booking. Add them in <a href="/customers">Customers</a> and <a href="/services">Services</a>.</div>:
      <>
        <div className="customer-fields">
          <label>Customer<select required value={customerId} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.full_name} · {c.phone_e164}</option>)}</select></label>
          <label>Service<select required value={serviceId} onChange={e=>setServiceId(e.target.value)}>{activeServices.map(s=><option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}</select></label>
          <label>Date<input required type="date" min={date} value={date} onChange={e=>setDate(e.target.value)} /></label>
          <label>Start time (IST)<input required type="time" value={time} onChange={e=>setTime(e.target.value)} /></label>
          <label className="notes-field">Notes (optional)<input maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any booking notes" /></label>
        </div>
        <p className="form-helper">Duration: {services.find(s=>s.id===serviceId)?.duration_minutes??0} minutes. Overlapping bookings are checked before saving.</p>
        <button className="primary-button" type="submit" disabled={busy}>{busy?"Booking…":"Confirm booking"}</button>
      </>}
    </form>}
    {message&&<p className="customer-feedback" role="status">{message}</p>}
    <section className="panel customer-table-panel">
      <div className="customer-table-heading"><div><h2>Appointments</h2><p>Upcoming and previous salon bookings</p></div></div>
      {sorted.length===0?<div className="customer-list-empty"><span>▦</span><strong>No appointments yet</strong><p>Once you add customers and services, book your first appointment here.</p></div>:
      <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Service</th><th>Date & time</th><th>Status</th><th>Update</th></tr></thead><tbody>{sorted.map(a=><tr key={a.id}><td><strong>{a.customer?.full_name??"Customer"}</strong></td><td>{a.service_name}</td><td>{displayDate(a.starts_at)}</td><td><span className={a.status==="confirmed"||a.status==="completed"?"consent-yes":"consent-no"}>{a.status.replace("_"," ")}</span></td><td><select className="status-select" aria-label={"Update status for "+a.service_name} value={a.status} onChange={e=>updateStatus(a.id,e.target.value)}><option value="booked">Booked</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option></select></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
