"use client";

import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { useAuth } from "./AuthProvider";

const HEADINGS = {
  login: "Σύνδεση",
  signup: "Δημιουργία Λογαριασμού",
  forgot: "Επαναφορά Κωδικού",
  reset: "Επιβεβαίωση OTP",
  dob: "Συμπλήρωση Ημερομηνίας Γέννησης",
};

const DESCRIPTIONS = {
  login: "Συνδεθείτε για να δείτε τις κρατήσεις σας.",
  signup: "Εγγραφείτε για να βλέπετε και να διαχειρίζεστε τα ραντεβού σας.",
  forgot: "Εισάγετε το κινητό σας και θα σας στείλουμε έναν κωδικό OTP.",
  reset: "Πληκτρολογήστε τον κωδικό OTP και ορίστε νέο κωδικό πρόσβασης.",
  dob: "Για να συνεχίσετε, πρέπει να αποθηκεύσετε ημερομηνία γέννησης (μία φορά).",
};

const CTA_LABEL = {
  login: "Σύνδεση",
  signup: "Εγγραφή",
  forgot: "Αποστολή OTP",
  reset: "Επιβεβαίωση",
  dob: "Αποθήκευση",
};

function isValidDobInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const minDate = new Date(Date.UTC(1900, 0, 1));
  return date >= minDate && date <= todayUtc;
}

function toDateFromDob(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toDobString(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AuthModal() {
  const {
    user,
    modalState,
    closeAuthModal,
    authenticate,
    setAuthMode,
    requestPasswordReset,
    resetPasswordWithOtp,
    completeDob,
    logout,
  } = useAuth();
  const { open, mode, loading, error, requiresDob } = modalState;

  const [view, setView] = useState(mode);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [otp, setOtp] = useState("");
  const [dobCalendarOpen, setDobCalendarOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [pendingResetPhone, setPendingResetPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const lockStateRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setView(mode);
      setName("");
      setPassword("");
      setPhone("");
      setDob("");
      setOtp("");
      setDobCalendarOpen(false);
      setFormError("");
      setInfoMessage("");
      setPendingResetPhone("");
      setShowPassword(false);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    if (mode === "login" || mode === "signup" || mode === "dob") {
      setView(mode);
      setDobCalendarOpen(false);
      setFormError("");
      setInfoMessage("");
      if (mode === "signup") {
        setName((prev) => prev.trim());
      }
      if (mode === "dob") {
        setDob((prev) => prev || user?.dob || "");
      }
      setShowPassword(false);
    }
  }, [mode, open, user?.dob]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const body = document.body;
    const prevCount = Number(body.dataset.modalLockCount || 0);
    if (prevCount === 0) {
      lockStateRef.current = {
        top: body.style.top,
        position: body.style.position,
        width: body.style.width,
        overflow: body.style.overflow,
        scrollY: window.scrollY,
      };
      body.style.top = `-${window.scrollY}px`;
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.overflow = "hidden";
    }
    body.dataset.modalLockCount = String(prevCount + 1);

    return () => {
      const count = Number(body.dataset.modalLockCount || 1) - 1;
      if (count <= 0) {
        const state = lockStateRef.current || {};
        body.style.position = state.position || "";
        body.style.width = state.width || "";
        body.style.top = state.top || "";
        body.style.overflow = state.overflow || "";
        body.removeAttribute("data-modal-lock-count");
        const y = state.scrollY || 0;
        window.scrollTo(0, y);
        lockStateRef.current = null;
      } else {
        body.dataset.modalLockCount = String(count);
      }
    };
  }, [open]);

  if (!open) return null;

  const goToLogin = () => {
    setAuthMode("login");
    setView("login");
    setFormError("");
    setInfoMessage("");
    setOtp("");
    setPendingResetPhone("");
    setShowPassword(false);
  };

  const goToSignup = () => {
    setAuthMode("signup");
    setView("signup");
    setFormError("");
    setInfoMessage("");
    setOtp("");
    setPendingResetPhone("");
    setShowPassword(false);
  };

  const goToForgot = () => {
    setView("forgot");
    setFormError("");
    setInfoMessage("");
    setOtp("");
    setPendingResetPhone("");
    setShowPassword(false);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setInfoMessage("");

    const trimmedName = name.trim();
    const normalizedPhone = phone.replace(/\s+/g, "");

    try {
      if (view === "login") {
        if (!normalizedPhone || !password) {
          setFormError("Συμπληρώστε κινητό και κωδικό.");
          return;
        }
        await authenticate({ mode: "login", phone: normalizedPhone, password });
        setPassword("");
      } else if (view === "signup") {
        if (!trimmedName || !password || !normalizedPhone || !dob) {
          setFormError("Συμπληρώστε όνομα, κωδικό, κινητό και ημερομηνία γέννησης.");
          return;
        }
        if (!isValidDobInput(dob)) {
          setFormError("Η ημερομηνία γέννησης δεν είναι έγκυρη.");
          return;
        }
        await authenticate({
          mode: "signup",
          name: trimmedName,
          password,
          phone: normalizedPhone,
          dob,
        });
        setName("");
        setPassword("");
        setPhone("");
        setDob("");
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
      } else if (view === "dob") {
        if (!dob) {
          setFormError("Συμπληρώστε ημερομηνία γέννησης.");
          return;
        }
        if (!isValidDobInput(dob)) {
          setFormError("Η ημερομηνία γέννησης δεν είναι έγκυρη.");
          return;
        }
        await completeDob(dob);
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
  const dobSelectedDate = toDateFromDob(dob);
  const dobDisplayValue = dobSelectedDate
    ? dobSelectedDate.toLocaleDateString("el-GR")
    : "Επιλέξτε ημερομηνία";

  const showNameField = view === "signup";
  const showDobField = view === "signup" || view === "dob";
  const showPhoneField = view === "login" || view === "signup" || view === "forgot" || view === "reset";
  const showPasswordField = view === "login" || view === "signup" || view === "reset";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/70 to-black/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur max-h-full overflow-y-auto">
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
              disabled={loading}
            />
          )}

          {showDobField && (
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/60">
                Ημερομηνία Γέννησης
              </span>
              <div className="group relative rounded-2xl border border-white/20 bg-white/[0.08] shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition hover:border-white/35">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent opacity-80" />
                <div className="relative flex items-center gap-3 px-4 py-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-white/70"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <button
                    type="button"
                    onClick={() => setDobCalendarOpen((prev) => !prev)}
                    onFocus={() => setDobCalendarOpen(true)}
                    disabled={loading}
                    className="dob-datepicker-trigger w-full bg-transparent text-left text-white outline-none disabled:opacity-60"
                  >
                    {dobDisplayValue}
                  </button>
                </div>
              </div>
              {dobCalendarOpen && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                  {/* Inline calendar avoids unstable portal/floating alignment inside backdrop-blur + scrolling modal layers. */}
                  <div className="dob-datepicker-inline-wrap flex justify-center">
                    <DatePicker
                      inline
                      selected={dobSelectedDate}
                      onChange={(date) => {
                        setDob(toDobString(date));
                        setDobCalendarOpen(false);
                      }}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      maxDate={new Date()}
                      disabled={loading}
                      calendarClassName="dob-datepicker-calendar"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDobCalendarOpen(false)}
                      disabled={loading}
                      className="rounded-lg border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/10 disabled:opacity-60"
                    >
                      Κλείσιμο
                    </button>
                  </div>
                </div>
              )}
            </label>
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
              disabled={loading}
            />
          )}

          {showPasswordField && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-12 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
                placeholder={view === "reset" ? "Νέος κωδικός" : "Κωδικός πρόσβασης"}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-white/70 hover:text-white"
                tabIndex={-1}
                aria-label={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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

        {view !== "dob" && (
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
        )}

        <div className="mt-6 flex justify-center gap-3">
          {!requiresDob && (
            <button
              type="button"
              onClick={closeAuthModal}
              className="rounded-xl border border-white/20 px-5 py-2 text-sm text-white/75 transition hover:bg-white/10"
              disabled={loading}
            >
              Άκυρο
            </button>
          )}
          {requiresDob && view === "dob" && (
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red-400/50 px-5 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
              disabled={loading}
            >
              Αποσύνδεση
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
