"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Template = { id:string; name:string; body:string; language:string; category:string };
type Campaign = { id:string; name:string; template_name:string; status:string; scheduled_at:string|null; created_at:string };

export default function CampaignManager({businessId,initialTemplates,initialCampaigns,eligibleAudienceCount}:{businessId:string;initialTemplates:Template[];initialCampaigns:Campaign[];eligibleAudienceCount:number}) {
  const [campaigns,setCampaigns]=useState(initialCampaigns);
  const [name,setName]=useState("");
  const [templateId,setTemplateId]=useState(initialTemplates[0]?.id??"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const selectedTemplate=initialTemplates.find(t=>t.id===templateId);

  async function saveCampaign(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!selectedTemplate){setMessage("Choose an approved Marketing template first.");return;}
    if(eligibleAudienceCount===0){setMessage("There are no customers with active WhatsApp consent yet.");return;}
    setBusy(true);setMessage("");
    try {
      const supabase=createClient();
      const {data,error}=await supabase.from("campaigns").insert({
        business_id:businessId,
        name:name.trim(),
        template_name:selectedTemplate.name,
        status:"draft",
        scheduled_at:null
      }).select("id,name,template_name,status,scheduled_at,created_at").single();
      if(error)throw error;
      setCampaigns(current=>[data as Campaign,...current]);
      setName("");setMessage("Campaign draft saved. No customers were contacted and no messages were sent.");
    } catch(e) {setMessage(e instanceof Error?e.message:"Could not save campaign draft.");}
    finally {setBusy(false);}
  }

  return <>
    <section className="stats-grid campaign-stats">
      <article className="stat-card"><div className="stat-top"><span>Eligible audience</span><i>♙</i></div><strong>{eligibleAudienceCount}</strong><small>Customers with active WhatsApp consent</small></article>
      <article className="stat-card"><div className="stat-top"><span>Approved marketing templates</span><i>▤</i></div><strong>{initialTemplates.length}</strong><small>Available for campaign drafts</small></article>
      <article className="stat-card"><div className="stat-top"><span>Campaign drafts</span><i>✉</i></div><strong>{campaigns.length}</strong><small>Saved in this workspace</small></article>
      <article className="stat-card"><div className="stat-top"><span>Sending status</span><i>◷</i></div><strong className="campaign-status-text">Disabled</strong><small>WhatsApp API is not connected</small></article>
    </section>

    <form className="customer-form panel" onSubmit={saveCampaign}>
      <div className="form-heading"><h2>Create a campaign draft</h2><p>Prepare a promotion and select an approved Meta Marketing template. This saves a draft only.</p></div>
      <div className="customer-fields">
        <label>Campaign name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Festive season offer" /></label>
        <label>Approved Marketing template<select required value={templateId} onChange={e=>setTemplateId(e.target.value)}><option value="">Choose a template</option>{initialTemplates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.language.toUpperCase()}</option>)}</select></label>
      </div>
      {selectedTemplate&&<div className="template-preview"><span>TEMPLATE PREVIEW · {selectedTemplate.language.toUpperCase()}</span><p>{selectedTemplate.body}</p><small>Variables will need to be mapped before sending is enabled.</small></div>}
      <div className="campaign-audience-note"><span className="check-dot done">✓</span><div><strong>Consent-based audience</strong><small>{eligibleAudienceCount} customers currently have WhatsApp opt-in and have not opted out. Eligibility must be checked again immediately before any future send.</small></div></div>
      {initialTemplates.length===0&&<p className="form-helper">No approved Marketing templates are available. Create a Marketing template in Message templates and obtain Meta approval before preparing a campaign.</p>}
      {message&&<p className="customer-feedback" role="status">{message}</p>}
      <button className="primary-button" type="submit" disabled={busy||initialTemplates.length===0||eligibleAudienceCount===0}>{busy?"Saving…":"Save campaign draft"}</button>
    </form>

    <section className="panel customer-table-panel">
      <div className="customer-table-heading"><div><h2>Campaigns</h2><p>{campaigns.length} saved · All new campaigns remain drafts</p></div></div>
      {campaigns.length===0?<div className="customer-list-empty"><span>✉</span><strong>No campaigns yet</strong><p>Create a draft when an approved Marketing template is available.</p></div>:
        <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Campaign</th><th>Template</th><th>Status</th><th>Created</th></tr></thead><tbody>{campaigns.map(c=><tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.template_name}</td><td><span className="consent-no">{c.status}</span></td><td>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(c.created_at))}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
