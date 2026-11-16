"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string;
  phone_e164: string;
  whatsapp_opt_in: boolean;
  notes: string | null;
  created_at: string;
};

export default function CustomerManager({ businessId, initialCustomers }: { businessId: string; initialCustomers: Customer[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
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
        opt_in_source: hasConsent ? "salon_owner_recorded_customer_consent" : null,
      }).select("id, full_name, phone_e164, whatsapp_opt_in, notes, created_at").single();
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
        <label className="consent-check"><input type="checkbox" checked={hasConsent} onChange={e => setHasConsent(e.target.checked)} /> The customer has explicitly agreed to receive WhatsApp messages from Kith and Kin.</label>
        {message && <p className="customer-feedback" role="status">{message}</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save customer"}</button>
      </form>}
      {!showForm && message && <p className="customer-feedback" role="status">{message}</p>}
      <section className="panel customer-table-panel">
        <div className="customer-table-heading"><div><h2>Customer list</h2><p>{customers.length} saved {customers.length === 1 ? "customer" : "customers"}</p></div></div>
        {filtered.length === 0 ? <div className="customer-list-empty"><span>♙</span><strong>{customers.length ? "No matching customers" : "No customers added yet"}</strong><p>{customers.length ? "Try another name or phone number." : "Add the salon's first customer to get started."}</p></div> :
          <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Customer</th><th>Phone</th><th>WhatsApp consent</th><th>Notes</th></tr></thead><tbody>{filtered.map(c => <tr key={c.id}><td><strong>{c.full_name}</strong></td><td>{c.phone_e164}</td><td><span className={c.whatsapp_opt_in ? "consent-yes" : "consent-no"}>{c.whatsapp_opt_in ? "Opted in" : "Not opted in"}</span></td><td>{c.notes || "—"}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}
