const navItems = [
  ["Overview", "⌂", true, "/"], ["Customers", "♙"], ["Appointments", "▦", false, "/appointments"],
  ["Services", "✂", false, "/services"],
  ["Campaigns", "✉"], ["Message templates", "▤"], ["Reminders", "◷"], ["Reports", "▥"], ["Settings", "⚙"]
] as const;

const stats = [
  { label: "Total customers", value: "—", note: "Your customer list", icon: "♙" },
  { label: "Appointments today", value: "—", note: "Today's bookings", icon: "▦" },
  { label: "Messages delivered", value: "—", note: "Delivery tracking", icon: "✓" },
  { label: "Active campaigns", value: "—", note: "WhatsApp promotions", icon: "✉" }
];

const tasks = [
  { title: "Connect WhatsApp Business", detail: "Add your Meta phone number and API credentials.", tag: "Setup" },
  { title: "Add your salon services", detail: "Create services, prices and appointment durations.", tag: "Next step" },
  { title: "Import customer contacts", detail: "Record consent before sending promotional messages.", tag: "Next step" }
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✂</span><span>glowdesk<small>SALON WORKSPACE</small></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{navItems.map(([label, icon, active]) => <a className={active ? "nav-link active" : "nav-link"} href={label === "Customers" ? "/customers" : label === "Appointments" ? "/appointments" : label === "Services" ? "/services" : label === "Message templates" ? "/templates" : label === "Reminders" ? "/reminders" : "#"} key={label}><span>{icon}</span>{label}</a>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><strong>Need a hand?</strong><p>Your salon setup checklist is ready.</p><span>View setup guide ↗</span></div><div className="profile"><div className="avatar">S</div><div><strong>Salon owner</strong><small>Administrator</small></div><span className="dots">•••</span></div></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> Overview</div><div className="top-actions"><span className="connection"><i/> WhatsApp not connected</span><div className="avatar small">S</div></div></header>
        <div className="content">
          <div className="welcome-row"><div><p className="eyebrow">MONDAY, YOUR SALON AT A GLANCE</p><h1>Good morning <span>✦</span></h1><p className="subhead">Here's what's happening with your salon today.</p></div><div className="date-pill">◷ &nbsp; Today</div></div>
          <section className="stats-grid">{stats.map((s) => <article className="stat-card" key={s.label}><div className="stat-top"><span>{s.label}</span><i>{s.icon}</i></div><strong>{s.value}</strong><small>{s.note}</small></article>)}</section>
          <section className="middle-grid">
            <article className="panel chart-panel"><div className="panel-heading"><div><h2>Message activity</h2><p>Your WhatsApp performance will appear here.</p></div><span className="period">Last 7 days⌄</span></div><div className="empty-chart"><div className="chart-lines"><i/><i/><i/><i/></div><div className="chart-bars"><span/><span/><span/><span/><span/><span/><span/></div><div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div><div className="chart-foot"><span><i/> Messages sent</span><span>Analytics start after your first campaign</span></div></article>
            <article className="panel api-panel"><div className="panel-heading"><div><h2>WhatsApp connection</h2><p>Official Meta Cloud API</p></div><span className="api-icon">◉</span></div><div className="api-status"><span className="status-dot"/>Not connected</div><p className="api-copy">Connect your salon's WhatsApp Business number to send approved templates and receive customer replies.</p><a className="primary-button" href="https://business.facebook.com/" target="_blank" rel="noreferrer">Set up WhatsApp ↗</a><small className="secure-note">Credentials stay on the server, never in the browser.</small></article>
          </section>
          <section className="panel setup-panel"><div className="panel-heading"><div><h2>Let's get your salon ready</h2><p>Complete these steps to start managing customer conversations.</p></div><span className="progress-label">0 of 3 complete</span></div><div className="setup-list">{tasks.map((task, i) => <div className="setup-item" key={task.title}><span className="step-number">{i + 1}</span><div className="setup-text"><strong>{task.title}</strong><p>{task.detail}</p></div><span className="task-tag">{task.tag}</span><span className="chevron">›</span></div>)}</div></section>
          <footer>Glowdesk · Built for salon teams <span>Powered by the official WhatsApp Cloud API</span></footer>
        </div>
      </section>
    </main>
  );
}
