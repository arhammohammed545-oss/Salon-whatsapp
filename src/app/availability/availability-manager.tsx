"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DayHours={day_of_week:number;is_closed:boolean;opens_at:string|null;closes_at:string|null;break_starts_at:string|null;break_ends_at:string|null};
type Closure={id:string;closed_on:string;reason:string|null};
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const emptyWeek:DayHours[]=DAYS.map((_,day_of_week)=>({day_of_week,is_closed:true,opens_at:null,closes_at:null,break_starts_at:null,break_ends_at:null}));
const timeValue=(value:string|null)=>value?.slice(0,5)??"";

export default function AvailabilityManager({businessId,initialHours,initialClosures}:{businessId:string;initialHours:DayHours[];initialClosures:Closure[]}) {
  const [week,setWeek]=useState(()=>emptyWeek.map(day=>({...day,...(initialHours.find(h=>h.day_of_week===day.day_of_week)??{})})));
  const [closures,setClosures]=useState(initialClosures);
  const [closedOn,setClosedOn]=useState("");
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date());

  function updateDay(day:number,patch:Partial<DayHours>){
    setWeek(current=>current.map(row=>row.day_of_week===day?{...row,...patch}:row));
  }

  async function saveSchedule(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    for(const day of week){
      if(day.is_closed)continue;
      if(!day.opens_at||!day.closes_at||day.closes_at<=day.opens_at){setMessage("For each open day, enter a valid opening and closing time.");setBusy(false);return;}
      if(Boolean(day.break_starts_at)!==Boolean(day.break_ends_at)){setMessage("Enter both break start and break end, or leave both blank.");setBusy(false);return;}
      if(day.break_starts_at&&day.break_ends_at&&
        (day.break_ends_at<=day.break_starts_at||day.break_starts_at<=day.opens_at||day.break_ends_at>=day.closes_at)){
        setMessage("Break times must be inside the opening hours.");setBusy(false);return;
      }
    }
    try{
      const supabase=createClient();
      const rows=week.map(day=>({
        business_id:businessId,day_of_week:day.day_of_week,is_closed:day.is_closed,
        opens_at:day.is_closed?null:day.opens_at,closes_at:day.is_closed?null:day.closes_at,
        break_starts_at:day.is_closed?null:day.break_starts_at||null,
        break_ends_at:day.is_closed?null:day.break_ends_at||null,updated_at:new Date().toISOString()
      }));
      const {error}=await supabase.from("salon_business_hours").upsert(rows,{onConflict:"business_id,day_of_week"});
      if(error)throw error;
      setMessage("Weekly working hours saved. These hours can now be used when checking booking availability.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not save working hours.");}
    finally{setBusy(false);}
  }

  async function addClosure(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    if(!closedOn||closedOn<today){setMessage("Choose today or a future date.");setBusy(false);return;}
    try{
      const supabase=createClient();
      const {data,error}=await supabase.from("salon_closures").insert({business_id:businessId,closed_on:closedOn,reason:reason.trim()||null}).select("id,closed_on,reason").single();
      if(error)throw error;
      setClosures(current=>[...current,data as Closure].sort((a,b)=>a.closed_on.localeCompare(b.closed_on)));
      setClosedOn("");setReason("");setMessage("Closed date added.");
    }catch(e){setMessage(e instanceof Error&&e.message.includes("duplicate")?"A closure is already set for that date.":e instanceof Error?e.message:"Could not add the closed date.");}
    finally{setBusy(false);}
  }

  async function removeClosure(id:string){
    setBusy(true);setMessage("");
    try{
      const supabase=createClient();
      const {error}=await supabase.from("salon_closures").delete().eq("id",id).eq("business_id",businessId);
      if(error)throw error;
      setClosures(current=>current.filter(c=>c.id!==id));setMessage("Closed date removed.");
    }catch(e){setMessage(e instanceof Error?e.message:"Could not remove the closed date.");}
    finally{setBusy(false);}
  }

  return <>
    <section className="availability-note panel"><strong>Booking timezone: India Standard Time (IST)</strong><p>Set the salon's regular hours below. Days marked closed and dates added as closures will not be offered as appointment slots. Breaks are excluded from availability.</p></section>
    <form className="panel availability-panel" onSubmit={saveSchedule}>
      <div className="customer-table-heading"><div><h2>Weekly working hours</h2><p>Configure opening, closing and optional break times for each day.</p></div></div>
      <div className="availability-days">
        {week.map(day=><div className="availability-day" key={day.day_of_week}>
          <div className="availability-day-name"><strong>{DAYS[day.day_of_week]}</strong><label className="availability-toggle"><input type="checkbox" checked={!day.is_closed} onChange={e=>updateDay(day.day_of_week,{is_closed:!e.target.checked,opens_at:!e.target.checked?null:day.opens_at,closes_at:!e.target.checked?null:day.closes_at})}/><span>{day.is_closed?"Closed":"Open"}</span></label></div>
          <div className="availability-time-grid">
            <label>Opens<input type="time" value={timeValue(day.opens_at)} disabled={day.is_closed} onChange={e=>updateDay(day.day_of_week,{opens_at:e.target.value||null})}/></label>
            <label>Closes<input type="time" value={timeValue(day.closes_at)} disabled={day.is_closed} onChange={e=>updateDay(day.day_of_week,{closes_at:e.target.value||null})}/></label>
            <label>Break starts (optional)<input type="time" value={timeValue(day.break_starts_at)} disabled={day.is_closed} onChange={e=>updateDay(day.day_of_week,{break_starts_at:e.target.value||null})}/></label>
            <label>Break ends (optional)<input type="time" value={timeValue(day.break_ends_at)} disabled={day.is_closed} onChange={e=>updateDay(day.day_of_week,{break_ends_at:e.target.value||null})}/></label>
          </div>
        </div>)}
      </div>
      <div className="availability-actions"><p className="form-helper">No default opening hours have been assumed. Enter the salon's actual timings before enabling bookings.</p><button className="primary-button" type="submit" disabled={busy}>{busy?"Saving…":"Save weekly hours"}</button></div>
    </form>
    <section className="panel availability-panel">
      <div className="customer-table-heading"><div><h2>Special closed dates</h2><p>Public holidays, staff leave, maintenance or one-off closures.</p></div></div>
      <form className="closure-form" onSubmit={addClosure}>
        <label>Date<input type="date" min={today} required value={closedOn} onChange={e=>setClosedOn(e.target.value)}/></label>
        <label>Reason (optional)<input maxLength={120} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Public holiday"/></label>
        <button className="primary-button" type="submit" disabled={busy||!closedOn}>Add closed date</button>
      </form>
      {closures.length===0?<div className="customer-list-empty"><span>◷</span><strong>No special closures added</strong><p>Add a date when the salon will be closed outside its regular weekly schedule.</p></div>:
      <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Date</th><th>Reason</th><th></th></tr></thead><tbody>{closures.map(c=><tr key={c.id}><td><strong>{new Date(c.closed_on+"T12:00:00+05:30").toLocaleDateString("en-IN",{dateStyle:"medium",timeZone:"Asia/Kolkata"})}</strong></td><td>{c.reason||"Not specified"}</td><td><button type="button" className="table-action table-action-danger" disabled={busy} onClick={()=>removeClosure(c.id)}>Remove</button></td></tr>)}</tbody></table></div>}
    </section>
    {message&&<p className="customer-feedback" role="status">{message}</p>}
  </>;
}
