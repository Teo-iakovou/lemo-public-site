export const metadata = {
  title: "Lemo Barbershop — Προσωρινή Διακοπή",
};

export default function MaintenancePage() {
  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#0a0a0a",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ margin: "0 auto 2rem", width: 80 }}>
          <img
            src="/LemoLogo_no_bg.png"
            alt="Lemo Barbershop"
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </div>

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 100,
            padding: "6px 14px",
            fontSize: 12,
            color: "#888",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: "#f59e0b",
              borderRadius: "50%",
              display: "inline-block",
              animation: "pulse 2s infinite",
            }}
          />
          Προσωρινή διακοπή
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 600,
            letterSpacing: "-0.5px",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}
        >
          Επιστρέφουμε σύντομα
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "#888",
            lineHeight: 1.7,
            marginBottom: "2rem",
          }}
        >
          Η πλατφόρμα μας αντιμετωπίζει προσωρινό τεχνικό πρόβλημα
          και δεν είναι διαθέσιμη αυτή τη στιγμή.
          Εργαζόμαστε για την επίλυσή του το συντομότερο δυνατό.
        </p>

        <p style={{ fontSize: 14, color: "#666", marginBottom: "0.5rem" }}>
          Για κρατήσεις, επικοινωνήστε μαζί μας απευθείας:
        </p>

        <a
          href="tel:+35799884716"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            color: "#ccc",
            marginTop: "1rem",
            textDecoration: "none",
          }}
        >
          📞 &nbsp;+357 99 884 716
        </a>

        <hr
          style={{
            border: "none",
            borderTop: "1px solid #1f1f1f",
            margin: "2rem 0",
          }}
        />

        <p style={{ fontSize: 13, color: "#555" }}>
          Lemo Barbershop &mdash; Λεμεσός, Κύπρος
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
