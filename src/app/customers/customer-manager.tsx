"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string;
  phone_e164: string;
  whatsapp_opt_in: boolean;
  opt_in_at: string | null;
  opt_in_source: string | null;
  opted_out_at: string | null;
  notes: string | null;
  created_at: string;
};

const customerFields = "id, full_name, phone_e164, whatsapp_opt_in, opt_in_at, opt_in_source, opted_out_at, notes, created_at";

export default function CustomerManager({ businessId, initialCustomers }: { businessId: string; initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) || c.phone_e164.includes(search)
  ), [customers, search]);

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (!/^\\+[1-9]\\d{7,14}$/.test(phone.trim())) {
      setMessage("Enter the phone number in international format, for example +919876543210.");
      setBusy(false);
      return;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("customers").insert({
        business_id: businessId,
        full_name: name.trim(),
        phone_e164: phone.trim(),
        notes: notes.trim() || null,
        whatsapp_opt_in: hasConsent,
        opt_in_at: hasConsent ? new Date().toISOString() : null,
        opt_in_source: hasConsent ? "business_owner_recorded_customer_consent" : null,
      }).select(customerFields).single();
      if (error) throw error;
      setCustomers(current => [data as Customer, ...current]);
      setName(""); setPhone(""); setNotes(""); setHasConsent(false); setShowForm(false);
      setMessage("Customer saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save this customer.");
    } finally {
      setBusy(false);
    }
  }

  async function updateConsent(customer: Customer) {
    const recordingConsent = !customer.whatsapp_opt_in;
    const prompt = recordingConsent
      ? "Confirm that this customer has just explicitly agreed to receive WhatsApp messages from this business."
      : "Mark this customer as opted out? They will be excluded from WhatsApp reminders and campaigns.";
    if (!window.confirm(prompt)) return;

    setBusyCustomerId(customer.id);
    setMessage("");
    try {
      const now = new Date().toISOString();
      const supabase = createClient();
      const { data, error } = await supabase.from("customers").update(recordingConsent ? {
        whatsapp_opt_in: true,
        opt_in_at: now,
        opt_in_source: "business_owner_recorded_customer_consent",
        opted_out_at: null,
      } : {
        whatsapp_opt_in: false,
        opted_out_at: now,
      }).eq("id", customer.id).eq("business_id", businessId).select(customerFields).single();
      if (error) throw error;
      setCustomers(current => current.map(item => item.id === customer.id ? data as Customer : item));
      setMessage(recordingConsent ? "New WhatsApp consent recorded." : "Customer opted out. They are excluded from WhatsApp messaging.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update consent.");
    } finally {
      setBusyCustomerId(null);
    }
  }

  return (
    <>
      <section className="customer-toolbar">
        <div className="customer-search"><span>⌕</span><input aria-label="Search customers" placeholder="Search by name or phone number" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button className="primary-button" type="button" onClick={() => setShowForm(v => !v)}>{showForm ? "Close" : "＋ Add customer"}</button>
      </section>
      {showForm && <form className="customer-form panel" onSubmit={addCustomer}>
        <div className="form-heading"><h2>Add a customer</h2><p>Only record WhatsApp consent when the customer has clearly agreed to receive messages.</p></div>
        <div className="customer-fields">
          <label>Customer name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></label>
          <label>Phone number (with country code)<input required maxLength={16} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+919876543210" /></label>
          <label className="notes-field">Notes (optional)<input maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Preferences or useful notes" /></label>
        </div>
        <label className="consent-check"><input type="checkbox" checked={hasConsent} onChange={e => setHasConsent(e.target.checked)} /> The customer has explicitly agreed to receive WhatsApp messages from this business.</label>
        <p className="form-helper">Leave this unchecked if consent has not been obtained. Booking an appointment does not automatically mean marketing consent.</p>
        {message && <p className="customer-feedback" role="status">{message}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save customer"}</button>
      </form>}
      {!showForm && message && <p className="customer-feedback" role="status">{message}</p>}
      <section className="panel customer-table-panel">
        <div className="customer-table-heading"><div><h2>Customer list</h2><p>{customers.length} saved {customers.length === 1 ? "customer" : "customers"} · {customers.filter(c => c.whatsapp_opt_in && !c.opted_out_at).length} currently opted in</p></div></div>
        {filtered.length === 0 ? <div className="customer-list-empty"><span>♙</span><strong>{customers.length ? "No matching customers" : "No customers added yet"}</strong><p>{customers.length ? "Try another name or phone number." : "Add the first customer to get started."}</p></div> :
          <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Phone</th><th>WhatsApp consent</th><th>Consent record</th><th>Notes</th><th>Action</th></tr></thead><tbody>{filtered.map(c => {
            const optedIn = c.whatsapp_opt_in && !c.opted_out_at;
            const consentDate = optedIn ? c.opt_in_at : c.opted_out_at;
            return <tr key={c.id}>
              <td><strong>{c.full_name}</strong></td><td>{c.phone_e164}</td>
              <td><span className={optedIn ? "consent-yes" : "consent-no"}>{optedIn ? "Opted in" : c.opted_out_at ? "Opted out" : "No consent"}</span></td>
              <td>{consentDate ? new Date(consentDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "No record"}</td>
              <td>{c.notes || "—"}</td>
              <td><button className={optedIn ? "table-action table-action-danger" : "table-action"} type="button" disabled={busyCustomerId === c.id} onClick={() => updateConsent(c)}>{busyCustomerId === c.id ? "Saving…" : optedIn ? "Opt out" : "Record new consent"}</button></td>
            </tr>;
          })}</tbody></table></div>}
      </section>
    </>
  );
}
