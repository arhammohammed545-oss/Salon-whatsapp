const navItems = [
  ["Overview", "⌂", "/"], ["Customers", "♙", "/customers"], ["Appointments", "▦", "#"],
  ["Campaigns", "✉", "#"], ["Message templates", "▤", "#"], ["Reports", "▥", "#"], ["Settings", "⚙", "#"]
] as const;

export default function CustomersPage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="/"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{navItems.map(([label, icon, href]) => <a className={label === "Customers" ? "nav-link active" : "nav-link"} href={href} key={label}><span>{icon}</span>{label}</a>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><strong>Customer care, made simple</strong><p>Keep customer details organised and respect each person's messaging preferences.</p><span>Glowdesk setup guide ↗</span></div><div className="profile"><div className="avatar">S</div><div><strong>Salon owner</strong><small>Administrator</small></div><span className="dots">•••</span></div></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="crumb"><a href="/">Workspace</a><span>/</span> Customers</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span><div className="avatar small">S</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow">CUSTOMER RELATIONSHIPS</p><h1>Customers</h1><p className="subhead">A clear view of the people who make Kith and Kin special.</p></div><span className="date-pill">Kith and Kin</span></div>
          <section className="customer-toolbar">
            <div className="customer-search"><span>⌕</span><input aria-label="Search customers" placeholder="Search by name or phone number" disabled /></div>
            <button className="primary-button" type="button" disabled title="Available after owner sign-in is enabled">＋ Add customer</button>
          </section>
          <section className="panel customer-empty">
            <div className="customer-empty-icon">♙</div>
            <h2>Your customer list starts here</h2>
            <p>Once secure owner sign-in is enabled, you can add customers, keep their contact details organised and view their appointment history.</p>
            <div className="customer-next-steps">
              <div><span>01</span><strong>Customer profiles</strong><small>Name, phone number and notes</small></div>
              <div><span>02</span><strong>Messaging consent</strong><small>Record opt-in and opt-out preferences</small></div>
              <div><span>03</span><strong>Visit history</strong><small>Appointments and customer activity</small></div>
            </div>
            <span className="setup-note"><i/> Secure customer storage is the next build step</span>
          </section>
          <footer>Glowdesk · Kith and Kin <span>Customer information stays private to the salon.</span></footer>
        </div>
      </section>
    </main>
  );
}
