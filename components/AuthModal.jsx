"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

const HEADINGS = {
  login: "Σύνδεση",
  signup: "Δημιουργία Λογαριασμού",
  forgot: "Επαναφορά Κωδικού",
  reset: "Επιβεβαίωση OTP",
};

const DESCRIPTIONS = {
  login: "Συνδεθείτε για να δείτε τις κρατήσεις σας.",
  signup: "Εγγραφείτε για να βλέπετε και να διαχειρίζεστε τα ραντεβού σας.",
  forgot: "Εισάγετε το κινητό σας και θα σας στείλουμε έναν κωδικό OTP.",
  reset: "Πληκτρολογήστε τον κωδικό OTP και ορίστε νέο κωδικό πρόσβασης.",
};

const CTA_LABEL = {
  login: "Σύνδεση",
  signup: "Εγγραφή",
  forgot: "Αποστολή OTP",
  reset: "Επιβεβαίωση",
};

export default function AuthModal() {
  const {
    modalState,
    closeAuthModal,
    authenticate,
    setAuthMode,
    requestPasswordReset,
    resetPasswordWithOtp,
  } = useAuth();
  const { open, mode, loading, error } = modalState;

  const [view, setView] = useState(mode);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [formError, setFormError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [pendingResetPhone, setPendingResetPhone] = useState("");

  useEffect(() => {
    if (!open) {
      setView(mode);
      setName("");
      setPassword("");
      setPhone("");
      setOtp("");
      setFormError("");
      setInfoMessage("");
      setPendingResetPhone("");
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    if (mode === "login" || mode === "signup") {
      setView(mode);
      setFormError("");
      setInfoMessage("");
      if (mode === "signup") {
        setName((prev) => prev.trim());
      }
    }
  }, [mode, open]);

  if (!open) return null;

  const goToLogin = () => {
    setAuthMode("login");
    setView("login");
    setFormError("");
    setInfoMessage("");
    setOtp("");
    setPendingResetPhone("");
  };

  const goToSignup = () => {
    setAuthMode("signup");
    setView("signup");
    setFormError("");
    setInfoMessage("");
    setOtp("");
    setPendingResetPhone("");
  };

  const goToForgot = () => {
    setView("forgot");
    setFormError("");
    setInfoMessage("");
    setOtp("");
    setPendingResetPhone("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setInfoMessage("");

    const trimmedName = name.trim();
    const normalizedPhone = phone.replace(/\s+/g, "");

    try {
      if (view === "login") {
        if (!trimmedName || !password) {
          setFormError("Συμπληρώστε όνομα και κωδικό.");
          return;
        }
        await authenticate({ mode: "login", name: trimmedName, password });
        setPassword("");
      } else if (view === "signup") {
        if (!trimmedName || !password || !normalizedPhone) {
          setFormError("Συμπληρώστε όνομα, κωδικό και κινητό.");
          return;
        }
        await authenticate({
          mode: "signup",
          name: trimmedName,
          password,
          phone: normalizedPhone,
        });
        setName("");
        setPassword("");
        setPhone("");
      } else if (view === "forgot") {
        if (!normalizedPhone) {
          setFormError("Συμπληρώστε τον αριθμό κινητού.");
          return;
        }
        await requestPasswordReset(normalizedPhone);
        setPendingResetPhone(normalizedPhone);
         setPhone(normalizedPhone);
        setInfoMessage("Στείλαμε OTP στο κινητό σας. Ισχύει για 10 λεπτά.");
        setView("reset");
        setOtp("");
        setPassword("");
      } else if (view === "reset") {
        const targetPhone = normalizedPhone || pendingResetPhone;
        if (!targetPhone) {
          setFormError("Συμπληρώστε τον αριθμό κινητού.");
          return;
        }
        if (!otp) {
          setFormError("Συμπληρώστε τον κωδικό OTP.");
          return;
        }
        if (!password) {
          setFormError("Συμπληρώστε τον νέο κωδικό.");
          return;
        }
        await resetPasswordWithOtp({ phone: targetPhone, otp, password });
        setInfoMessage("Ο κωδικός ενημερώθηκε. Συνδεθείτε με τον νέο κωδικό.");
        setPendingResetPhone("");
        setOtp("");
        setPassword("");
        setView("login");
      }
    } catch (err) {
      const msg = String(err.message || "").toLowerCase().includes("invalid credentials")
        ? "Λάθος στοιχεία σύνδεσης."
        : err.message || "Κάτι πήγε στραβά.";
      setFormError(msg);
    }
  };

  const combinedError = formError || error;
  const heading = HEADINGS[view] || HEADINGS.login;
  const description = DESCRIPTIONS[view] || "";
  const cta = CTA_LABEL[view] || CTA_LABEL.login;

  const showNameField = view === "login" || view === "signup";
  const showPhoneField = view === "signup" || view === "forgot" || view === "reset";
  const showPasswordField = view === "login" || view === "signup" || view === "reset";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/70 to-black/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="text-center space-y-2 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Lemo Barbershop</p>
          <h2 className="text-2xl font-display text-white">{heading}</h2>
          {description && <p className="text-sm text-white/70">{description}</p>}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {showNameField && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
              placeholder="Όνομα χρήστη"
              autoFocus
              disabled={loading}
            />
          )}

          {showPhoneField && (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
              placeholder="Τηλέφωνο"
              autoFocus={!showNameField && view !== "reset"}
              disabled={loading}
            />
          )}

          {view === "reset" && (
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ""))}
              maxLength={6}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition tracking-[0.3em] text-center"
              placeholder="OTP"
              autoFocus
              disabled={loading}
            />
          )}

          {showPasswordField && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
              placeholder={view === "reset" ? "Νέος κωδικός" : "Κωδικός πρόσβασης"}
              disabled={loading}
            />
          )}

          {infoMessage && (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {infoMessage}
            </p>
          )}

          {combinedError && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {combinedError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? "Επεξεργασία..." : cta}
          </button>
        </form>

        {view === "login" && (
          <div className="mt-3 text-center">
            <button
              type="button"
              className="text-sm text-white/70 hover:text-white underline underline-offset-4"
              onClick={goToForgot}
              disabled={loading}
            >
              Ξεχάσατε τον κωδικό;
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-white/70">
          {view === "signup" ? (
            <>
              Έχετε ήδη λογαριασμό;{" "}
              <button
                type="button"
                className="text-white hover:text-white/80 underline underline-offset-4"
                onClick={goToLogin}
                disabled={loading}
              >
                Συνδεθείτε
              </button>
            </>
          ) : view === "login" ? (
            <>
              Δεν έχετε λογαριασμό;{" "}
              <button
                type="button"
                className="text-purple-300 hover:text-purple-200 underline"
                onClick={goToSignup}
                disabled={loading}
              >
                Δημιουργία
              </button>
            </>
          ) : (
            <>
              Θυμηθήκατε τον κωδικό;{" "}
              <button
                type="button"
                className="text-white hover:text-white/80 underline underline-offset-4"
                onClick={goToLogin}
                disabled={loading}
              >
                Σύνδεση
              </button>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-xl border border-white/20 px-5 py-2 text-sm text-white/75 transition hover:bg-white/10"
            disabled={loading}
          >
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  );
}
