import { SignOutButton } from "@clerk/nextjs";

export default function AccessDeniedPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          padding: "48px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>
          Acceso restringido
        </h1>

        <p style={{ fontSize: "14px", color: "#64748B", lineHeight: "1.6", marginBottom: "8px" }}>
          Tu cuenta no está autorizada para acceder a esta aplicación.
        </p>

        <p style={{ fontSize: "14px", color: "#64748B", lineHeight: "1.6", marginBottom: "32px" }}>
          Solicita al administrador que te registre antes de intentar ingresar.
        </p>

        <SignOutButton redirectUrl="/sign-in">
          <button
            style={{
              background: "#0F172A",
              color: "#fff",
              padding: "10px 28px",
              borderRadius: "6px",
              border: "none",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
