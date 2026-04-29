"use client";

import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { useAuth } from "./AuthProvider";
import { mapCommonErrorMessage } from "../lib/i18n";
import { useLanguage } from "./LanguageProvider";

const DOB_SAFE_VIEW_DATE = new Date(2000, 0, 1);
const DOB_YEAR_MIN = 1900;

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
  const { t, locale } = useLanguage();
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
  const [dobCalendarViewDate, setDobCalendarViewDate] = useState(DOB_SAFE_VIEW_DATE);
  const [dobYearStepDone, setDobYearStepDone] = useState(false);
  const [dobMonthStepDone, setDobMonthStepDone] = useState(false);
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
      setDobCalendarViewDate(DOB_SAFE_VIEW_DATE);
      setDobYearStepDone(false);
      setDobMonthStepDone(false);
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
      setDobCalendarViewDate(DOB_SAFE_VIEW_DATE);
      setDobYearStepDone(false);
      setDobMonthStepDone(false);
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
          setFormError(t("auth.errors.fillPhonePassword"));
          return;
        }
        await authenticate({ mode: "login", phone: normalizedPhone, password });
        setPassword("");
      } else if (view === "signup") {
        if (!trimmedName || !password || !normalizedPhone || !dob) {
          setFormError(t("auth.errors.fillSignupFields"));
          return;
        }
        if (!isValidDobInput(dob)) {
          setFormError(t("auth.errors.invalidDob"));
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
          setFormError(t("auth.errors.fillPhone"));
          return;
        }
        await requestPasswordReset(normalizedPhone);
        setPendingResetPhone(normalizedPhone);
         setPhone(normalizedPhone);
        setInfoMessage(t("auth.messages.otpSent"));
        setView("reset");
        setOtp("");
        setPassword("");
      } else if (view === "reset") {
        const targetPhone = normalizedPhone || pendingResetPhone;
        if (!targetPhone) {
          setFormError(t("auth.errors.fillPhone"));
          return;
        }
        if (!otp) {
          setFormError(t("auth.errors.fillOtp"));
          return;
        }
        if (!password) {
          setFormError(t("auth.errors.fillNewPassword"));
          return;
        }
        await resetPasswordWithOtp({ phone: targetPhone, otp, password });
        setInfoMessage(t("auth.messages.passwordUpdated"));
        setPendingResetPhone("");
        setOtp("");
        setPassword("");
        setView("login");
      } else if (view === "dob") {
        if (!dob) {
          setFormError(t("auth.errors.fillDob"));
          return;
        }
        if (!isValidDobInput(dob)) {
          setFormError(t("auth.errors.invalidDob"));
          return;
        }
        await completeDob(dob);
      }
    } catch (err) {
      const msg = mapCommonErrorMessage(err?.message, t);
      setFormError(msg);
    }
  };

  const combinedError = formError || error;
  const heading = t(`auth.headings.${view}`) || t("auth.headings.login");
  const description = t(`auth.descriptions.${view}`) || "";
  const cta = t(`auth.cta.${view}`) || t("auth.cta.login");
  const dobSelectedDate = toDateFromDob(dob);
  const dobDisplayValue = dobSelectedDate
    ? dobSelectedDate.toLocaleDateString(locale)
    : t("common.selectDate");
  const dobMonthLabels = Array.from({ length: 12 }, (_, monthIndex) =>
    new Date(2026, monthIndex, 1).toLocaleString(locale, { month: "long" })
  );

  const showNameField = view === "signup";
  const showDobField = view === "signup" || view === "dob";
  const showPhoneField = view === "login" || view === "signup" || view === "forgot" || view === "reset";
  const showPasswordField = view === "login" || view === "signup" || view === "reset";
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - DOB_YEAR_MIN + 1 }, (_, idx) => currentYear - idx);

  const openDobCalendar = () => {
    const existingDobDate = toDateFromDob(dob);
    if (existingDobDate) {
      setDobCalendarViewDate(existingDobDate);
      setDobYearStepDone(true);
      setDobMonthStepDone(true);
    } else {
      setDobCalendarViewDate(DOB_SAFE_VIEW_DATE);
      setDobYearStepDone(false);
      setDobMonthStepDone(false);
    }
    setDobCalendarOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/70 to-black/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] backdrop-blur max-h-full overflow-y-auto">
        <div className="text-center space-y-2 mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Lemo Barbershop</p>
          <h2 className="text-2xl font-display text-white">{heading}</h2>
          {description && <p className="text-sm text-white/70">{description}</p>}
        </div>

        {view === "login" && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 text-center">
            {t("auth.messages.systemUpdated")}{" "}
            <button
              type="button"
              onClick={goToSignup}
              className="underline underline-offset-2 font-semibold hover:text-white transition"
            >
              {t("auth.messages.signupAgain")}
            </button>
            .
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {showNameField && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
              placeholder={t("auth.fields.username")}
              disabled={loading}
            />
          )}

          {showPhoneField && (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
              placeholder={t("auth.fields.phone")}
              disabled={loading}
            />
          )}

          {showDobField && (
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/60">
                {t("auth.fields.dob")}
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
                    onClick={openDobCalendar}
                    onFocus={openDobCalendar}
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
                  <p className="mb-2 text-xs text-white/70">{t("auth.hints.stepFlow")}</p>
                  <div className="dob-datepicker-inline-wrap flex justify-center">
                    <DatePicker
                      inline
                      selected={dobSelectedDate}
                      onChange={(date) => {
                        setDob(toDobString(date));
                        setDobCalendarOpen(false);
                        setDobYearStepDone(true);
                        setDobMonthStepDone(true);
                      }}
                      openToDate={dobCalendarViewDate}
                      onMonthChange={(date) => {
                        setDobCalendarViewDate(date || dobCalendarViewDate);
                      }}
                      onYearChange={(date) => {
                        setDobCalendarViewDate(date || dobCalendarViewDate);
                      }}
                      filterDate={() => dobYearStepDone && dobMonthStepDone}
                      renderCustomHeader={({ date, changeYear, changeMonth }) => {
                        const selectedYear = date.getFullYear();
                        const selectedMonth = date.getMonth();
                        return (
                          <div className="mb-2 flex items-center gap-2 px-2">
                            <select
                              value={selectedYear}
                              onChange={(e) => {
                                const nextYear = Number(e.target.value);
                                changeYear(nextYear);
                                if (!dobMonthStepDone) changeMonth(0);
                                setDobCalendarViewDate(new Date(nextYear, dobMonthStepDone ? selectedMonth : 0, 1));
                                setDobYearStepDone(true);
                              }}
                              className="h-9 rounded-md border border-white/25 bg-black/40 px-2 text-xs text-white"
                              disabled={loading}
                            >
                              {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                            <select
                              value={selectedMonth}
                              onChange={(e) => {
                                const nextMonth = Number(e.target.value);
                                changeMonth(nextMonth);
                                setDobCalendarViewDate(new Date(selectedYear, nextMonth, 1));
                                setDobMonthStepDone(true);
                              }}
                              disabled={!dobYearStepDone || loading}
                              className="h-9 flex-1 rounded-md border border-white/25 bg-black/40 px-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {dobMonthLabels.map((monthLabel, monthIndex) => (
                                <option key={monthLabel} value={monthIndex}>
                                  {monthLabel}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }}
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
                      {t("common.close")}
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
                placeholder={
                  view === "reset" ? t("auth.fields.newPassword") : t("auth.fields.password")
                }
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-white/70 hover:text-white"
                tabIndex={-1}
                aria-label={showPassword ? t("auth.actions.closePassword") : t("auth.actions.showPassword")}
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
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <p>{combinedError}</p>
              {view === "login" && (
                <button
                  type="button"
                  onClick={goToSignup}
                  disabled={loading}
                  className="mt-2 block w-full rounded-lg border border-white/20 py-1.5 text-center text-xs font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  {t("auth.links.createNewAccountArrow")}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? t("common.loading") : cta}
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
              {t("auth.links.forgotPassword")}
            </button>
          </div>
        )}

        {view !== "dob" && (
          <div className="mt-6 text-center text-sm text-white/70">
          {view === "signup" ? (
            <>
              {t("auth.links.haveAccount")}{" "}
              <button
                type="button"
                className="text-white hover:text-white/80 underline underline-offset-4"
                onClick={goToLogin}
                disabled={loading}
              >
                {t("auth.links.signIn")}
              </button>
            </>
          ) : view === "login" ? (
            <>
              {t("auth.links.noAccount")}{" "}
              <button
                type="button"
                className="font-semibold text-white hover:text-white/80 underline underline-offset-4"
                onClick={goToSignup}
                disabled={loading}
              >
                {t("auth.links.createAccount")}
              </button>
            </>
          ) : (
            <>
              {t("auth.links.rememberPassword")}{" "}
              <button
                type="button"
                className="text-white hover:text-white/80 underline underline-offset-4"
                onClick={goToLogin}
                disabled={loading}
              >
                {t("auth.cta.login")}
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
              {t("common.cancel")}
            </button>
          )}
          {requiresDob && view === "dob" && (
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red-400/50 px-5 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
              disabled={loading}
            >
              {t("common.logout")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
