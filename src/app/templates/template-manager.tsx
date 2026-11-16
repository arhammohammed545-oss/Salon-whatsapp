"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Template = { id:string; name:string; category:"UTILITY"|"MARKETING"|"AUTHENTICATION"; language:string; body:string; status:string; created_at:string };

export default function TemplateManager({businessId,initialTemplates}:{businessId:string;initialTemplates:Template[]}) {
  const [templates,setTemplates]=useState(initialTemplates);
  const [showForm,setShowForm]=useState(false);
  const [name,setName]=useState("");
  const [category,setCategory]=useState<Template["category"]>("UTILITY");
  const [language,setLanguage]=useState("en");
  const [body,setBody]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function saveTemplate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const safeName=name.trim().toLowerCase().replace(/[^a-z0-9_]/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"");
    if(safeName.length<3){setMessage("Use at least 3 letters or numbers in the template name.");setBusy(false);return;}
    if(!body.trim()){setMessage("Enter the message body first.");setBusy(false);return;}
    try {
      const supabase=createClient();
      const {data,error}=await supabase.from("message_templates").insert({
        business_id:businessId,name:safeName,category,language,body:body.trim(),status:"draft"
      }).select("id,name,category,language,body,status,created_at").single();
      if(error)throw error;
      setTemplates(current=>[data as Template,...current]);
      setName("");setCategory("UTILITY");setLanguage("en");setBody("");setShowForm(false);setMessage("Draft saved. It has not been submitted to Meta or sent.");
    } catch(e) {setMessage(e instanceof Error?e.message:"Could not save this template.");}
    finally {setBusy(false);}
  }

  return <>
    <section className="customer-toolbar"><div className="customer-search"><span>▤</span><input aria-label="Template count" disabled value={templates.length+" templates"} /></div><button className="primary-button" type="button" onClick={()=>setShowForm(v=>!v)}>{showForm?"Close":"＋ Create template"}</button></section>
    {showForm&&<form className="customer-form panel" onSubmit={saveTemplate}>
      <div className="form-heading"><h2>Create a message template</h2><p>Use placeholders such as {"{{1}}"} for customer-specific details. Keep the text clear and accurate.</p></div>
      <div className="customer-fields">
        <label>Template name<input required maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. appointment_reminder" /></label>
        <label>Category<select value={category} onChange={e=>setCategory(e.target.value as Template["category"])}><option value="UTILITY">Utility · booking updates</option><option value="MARKETING">Marketing · offers and promotions</option><option value="AUTHENTICATION">Authentication · verification</option></select></label>
        <label>Language<select value={language} onChange={e=>setLanguage(e.target.value)}><option value="en">English</option><option value="ta">Tamil</option><option value="hi">Hindi</option></select></label>
        <label className="notes-field">Message body<textarea required maxLength={1024} rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder="Hello {{1}}, this is a reminder of your appointment at Kith and Kin on {{2}}." /></label>
      </div>
      <p className="form-helper">Template names are saved in lowercase with underscores. Maximum body length: 1,024 characters.</p>
      <div className="template-preview"><span>MESSAGE PREVIEW</span><p>{body.trim()||"Your message preview will appear here."}</p><small>Variables like {"{{1}}"} will be filled in by a future messaging workflow.</small></div>
      <button className="primary-button" type="submit" disabled={busy}>{busy?"Saving…":"Save as draft"}</button>
    </form>}
    {message&&<p className="customer-feedback" role="status">{message}</p>}
    <section className="panel customer-table-panel">
      <div className="customer-table-heading"><div><h2>Your templates</h2><p>{templates.length} saved · Drafts are not sent to customers</p></div></div>
      {templates.length===0?<div className="customer-list-empty"><span>▤</span><strong>No message templates yet</strong><p>Create your first reusable WhatsApp message. Appointment reminders and customer follow-ups can use approved templates later.</p></div>:
      <div className="template-list">{templates.map(t=><article className="template-card" key={t.id}><div className="template-card-head"><div><strong>{t.name}</strong><small>{t.category} · {t.language.toUpperCase()}</small></div><span className={t.status==="approved"?"consent-yes":"consent-no"}>{t.status}</span></div><p>{t.body}</p><small>Created {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(t.created_at))}</small></article>)}</div>}
    </section>
  </>;
}
