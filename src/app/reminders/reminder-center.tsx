"use client";

type Customer={id:string;full_name:string;phone_e164:string;whatsapp_opt_in:boolean;opted_out_at:string|null};
type Appointment={id:string;customer_id:string;service_name:string;starts_at:string;status:string;customer:Customer|null};
type QueueItem={id:string;appointment_id:string;customer_id:string;reminder_type:string;template_name:string;scheduled_for:string;status:string;attempt_count:number;customer:Customer|null};

export default function ReminderCenter({appointments,queue,approvedTemplateCount,whatsappConnected}:{appointments:Appointment[];queue:QueueItem[];approvedTemplateCount:number;whatsappConnected:boolean}) {
 const eligible=(a:Appointment)=>Boolean(a.customer?.whatsapp_opt_in&&!a.customer.opted_out_at);
 const ready=appointments.filter(eligible);
 const blocked=appointments.filter(a=>!eligible(a));
 const pending=queue.filter(q=>q.status==="pending").length;
 const fmt=(value:string)=>new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(value));
 const statusLabel=(status:string)=>status.replace("_"," ");
 return <>
  <div className="stats-grid reminder-stats">
   <article className="stat-card"><div className="stat-label">Upcoming bookings</div><div className="stat-value">{appointments.length}</div><div className="stat-foot">Within the next 7 days</div></article>
   <article className="stat-card"><div className="stat-label">Customer opt-in recorded</div><div className="stat-value">{ready.length}</div><div className="stat-foot">Eligible for reminder review</div></article>
   <article className="stat-card"><div className="stat-label">Not eligible</div><div className="stat-value">{blocked.length}</div><div className="stat-foot">No opt-in or customer record</div></article>
   <article className="stat-card"><div className="stat-label">Pending reminder records</div><div className="stat-value">{pending}</div><div className="stat-foot">Queued, not sent</div></article>
  </div>
  <section className="panel reminder-checklist"><div className="customer-table-heading"><div><h2>Reminder setup checklist</h2><p>Sending remains disabled until the official WhatsApp connection is configured and tested.</p></div></div><div className="reminder-check-row"><span className={whatsappConnected?"check-dot done":"check-dot"}>{whatsappConnected?"✓":"1"}</span><div><strong>Connect the salon’s WhatsApp Cloud API number</strong><small>{whatsappConnected?"Phone number details are saved.":"Not connected yet."}</small></div><span className="consent-no">{whatsappConnected?"Connected":"Pending"}</span></div><div className="reminder-check-row"><span className={approvedTemplateCount>0?"check-dot done":"check-dot"}>{approvedTemplateCount>0?"✓":"2"}</span><div><strong>Get a Utility reminder template approved by Meta</strong><small>{approvedTemplateCount>0?approvedTemplateCount+" approved template(s) found.":"No approved Utility template found."}</small></div><span className={approvedTemplateCount>0?"consent-yes":"consent-no"}>{approvedTemplateCount>0?"Ready":"Pending"}</span></div><div className="reminder-check-row"><span className="check-dot">3</span><div><strong>Record customer WhatsApp consent</strong><small>Only customers with opt-in and no later opt-out can receive reminders.</small></div><a href="/customers">Manage customers ↗</a></div></section>
  <section className="panel customer-table-panel"><div className="customer-table-heading"><div><h2>Scheduled reminder queue</h2><p>Created automatically for eligible bookings. Entries here are not sent to customers.</p></div></div>
   {queue.length===0?<div className="customer-list-empty"><span>◷</span><strong>No reminder records yet</strong><p>New eligible appointments will appear after an approved Utility template and customer opt-in are available.</p></div>:<div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Reminder</th><th>Scheduled for (IST)</th><th>Template</th><th>Status</th></tr></thead><tbody>{queue.map(q=><tr key={q.id}><td><strong>{q.customer?.full_name??"Customer unavailable"}</strong><small className="table-subtext">{q.customer?.phone_e164??"No phone record"}</small></td><td>{q.reminder_type==="day_before"?"1 day before":"2 hours before"}</td><td>{fmt(q.scheduled_for)}</td><td>{q.template_name}</td><td><span className={q.status==="pending"?"consent-yes":"consent-no"}>{statusLabel(q.status)}</span></td></tr>)}</tbody></table></div>}
  </section>
  <section className="panel customer-table-panel"><div className="customer-table-heading"><div><h2>Upcoming appointments</h2><p>Consent is checked before reminder records are created.</p></div></div>
   {appointments.length===0?<div className="customer-list-empty"><span>◷</span><strong>No upcoming appointments</strong><p>Bookings in the next seven days will appear here.</p></div>:<div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Service</th><th>Appointment time</th><th>WhatsApp consent</th></tr></thead><tbody>{appointments.map(a=><tr key={a.id}><td><strong>{a.customer?.full_name??"Customer unavailable"}</strong><small className="table-subtext">{a.customer?.phone_e164??"No phone record"}</small></td><td>{a.service_name}</td><td>{fmt(a.starts_at)}</td><td><span className={eligible(a)?"consent-yes":"consent-no"}>{eligible(a)?"Opted in":"Not eligible"}</span></td></tr>)}</tbody></table></div>}
  </section>
  <p className="reminder-footnote">Queue scheduling is automated. Message dispatch is intentionally disabled; no WhatsApp messages are sent.</p>
 </>;
}
