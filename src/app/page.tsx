const modules = [
  { title: "Customers", description: "Manage customer details and messaging consent.", status: "Planned" },
  { title: "Appointments", description: "Schedule visits and prepare reminder messages.", status: "Planned" },
  { title: "Message templates", description: "Use approved WhatsApp templates.", status: "Planned" },
  { title: "Campaigns", description: "Send relevant updates to opted-in customers.", status: "Planned" },
  { title: "Inbox & webhooks", description: "Receive replies and delivery status events.", status: "Scaffolded" },
  { title: "Reports", description: "Review delivery, engagement, and opt-out metrics.", status: "Planned" }
];

export default function Home() {
  return (
    <main style={{ maxWidth: 1080, margin: "48px auto", padding: "0 24px" }}>
      <header style={{ marginBottom: 32 }}>
        <p style={{ color: "#147d64", fontWeight: 700, letterSpacing: 1, fontSize: 12 }}>SALON OPERATIONS</p>
        <h1 style={{ fontSize: 36, margin: "8px 0" }}>WhatsApp Manager</h1>
        <p style={{ color: "#667085", margin: 0 }}>A central workspace for customers, appointments, and compliant messaging.</p>
      </header>
      <section aria-label="Project modules" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {modules.map((module) => (
          <article key={module.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{module.title}</h2>
              <span style={{ color: "#147d64", background: "#e9f5f1", borderRadius: 999, padding: "4px 9px", fontSize: 11 }}>{module.status}</span>
            </div>
            <p style={{ color: "#667085", lineHeight: 1.5, marginBottom: 0 }}>{module.description}</p>
          </article>
        ))}
      </section>
      <p style={{ color: "#667085", fontSize: 13, marginTop: 28 }}>Starter scaffold — connect Supabase and Meta credentials only through secure server-side environment variables.</p>
    </main>
  );
}
