"use client";

import { useCallback, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "./LanguageProvider";
import { mapCommonErrorMessage } from "../lib/i18n";

const DOB_SAFE_VIEW_DATE = new Date(2000, 0, 1);
const DOB_YEAR_MIN = 1900;

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

export default function ProfilePanel() {
  const { t, locale } = useLanguage();
  const { profileOpen, closeProfile, user, logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cancelingId, setCancelingId] = useState(null);
  const [lastFocusedElement, setLastFocusedElement] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState("success");
  const [confirmPrompt, setConfirmPrompt] = useState(null);
  const [editingDob, setEditingDob] = useState(false);
  const [dobDraft, setDobDraft] = useState("");
  const [dobCalendarOpen, setDobCalendarOpen] = useState(false);
  const [dobCalendarViewDate, setDobCalendarViewDate] = useState(DOB_SAFE_VIEW_DATE);
  const [dobYearStepDone, setDobYearStepDone] = useState(false);
  const [dobMonthStepDone, setDobMonthStepDone] = useState(false);
  const [savingDob, setSavingDob] = useState(false);

  useEffect(() => {
    if (!profileOpen) {
      setAppointments([]);
      setError("");
      setInfoMessage("");
      setEditingDob(false);
      setDobDraft("");
      setDobCalendarOpen(false);
      setDobCalendarViewDate(DOB_SAFE_VIEW_DATE);
      setDobYearStepDone(false);
      setDobMonthStepDone(false);
      return;
    }
    let canceled = false;
    async function load() {
      setLoading(true);
      setError("");
      setInfoMessage("");
      try {
        const res = await fetch("/api/appointments/mine", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) {
            await logout();
            if (!canceled) setError(t("common.error"));
            return;
          }
          throw new Error(data?.error || t("profile.errors.cancelFailed"));
        }
        if (!canceled) {
          const list = Array.isArray(data.appointments) ? data.appointments : [];
          setAppointments(
            list.slice().sort((a, b) => {
              const da = new Date(a.appointmentDateTime).getTime();
              const db = new Date(b.appointmentDateTime).getTime();
              return db - da;
            })
          );
        }
      } catch (err) {
        if (!canceled) setError(mapCommonErrorMessage(err?.message, t));
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => {
      canceled = true;
    };
  }, [profileOpen, logout]);

  useEffect(() => {
    if (!profileOpen) return;
    setEditingDob(false);
    setDobDraft(user?.dob || "");
    setDobCalendarOpen(false);
    setDobCalendarViewDate(DOB_SAFE_VIEW_DATE);
    setDobYearStepDone(false);
    setDobMonthStepDone(false);
  }, [profileOpen, user?.dob]);

  useEffect(() => {
    if (profileOpen) {
      setLastFocusedElement(document.activeElement);
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (top) {
        const scrollY = parseInt(top || "0", 10) * -1;
        window.scrollTo(0, Number.isFinite(scrollY) ? scrollY : 0);
      }
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }
    return () => {
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [profileOpen, lastFocusedElement]);

  useEffect(() => {
    if (infoMessage) {
      setShowToast(true);
      const timeout = window.setTimeout(() => {
        setShowToast(false);
        setInfoMessage("");
        setToastType("success");
      }, 4000);
      return () => window.clearTimeout(timeout);
    }
    setShowToast(false);
    return undefined;
  }, [infoMessage]);

  const validateDob = useCallback((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
      return t("profile.errors.validDate");
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return t("profile.errors.dateInvalid");
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (parsed > todayUtc) return t("profile.errors.dateFuture");
    return "";
  }, [t]);

  const saveDob = useCallback(async () => {
    if (savingDob) return;
    const validationMessage = validateDob(dobDraft);
    if (validationMessage) {
      setError("");
      setToastType("error");
      setInfoMessage(validationMessage);
      return;
    }

    setSavingDob(true);
    setError("");
    setInfoMessage("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob: dobDraft }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t("profile.errors.saveDobFailed"));
      }
      await refreshUser();
      setEditingDob(false);
      setToastType("success");
      setInfoMessage(t("profile.messages.dobUpdated"));
    } catch (err) {
      setDobDraft(user?.dob || "");
      setToastType("error");
      setInfoMessage(mapCommonErrorMessage(err?.message, t));
    } finally {
      setSavingDob(false);
    }
  }, [dobDraft, refreshUser, savingDob, t, user?.dob, validateDob]);

  const performCancel = useCallback(
    async (id) => {
      if (!id || cancelingId) return;
      setCancelingId(id);
      setError("");
      setInfoMessage("");
      try {
        const res = await fetch(`/api/appointments/mine?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || t("profile.errors.cancelFailed"));
        }
        setAppointments((prev) => prev.filter((appt) => appt._id !== id));
        setToastType("success");
        setInfoMessage(data?.message || t("profile.messages.appointmentCancelled"));
      } catch (err) {
        setError(mapCommonErrorMessage(err?.message, t));
      } finally {
        setCancelingId(null);
      }
    },
    [cancelingId, t]
  );

  const requestCancel = useCallback(
    (id) => {
      if (!id || cancelingId) return;
      setConfirmPrompt({ type: "cancel", id });
    },
    [cancelingId]
  );

  const performReschedule = useCallback(
    (appt, locked) => {
      if (!appt || typeof window === "undefined") return;
      const detail = {
        editAppointment: {
          id: appt._id,
          appointmentDateTime: appt.appointmentDateTime,
          barber: appt.barber,
          customerName: appt.customerName,
          locked,
        },
      };
      closeProfile();
      window.dispatchEvent(new CustomEvent("open-booking", { detail }));
    },
    [closeProfile]
  );

  const requestReschedule = useCallback((appt, locked) => {
    if (!appt || typeof window === "undefined") return;
    setConfirmPrompt({ type: "reschedule", appt, locked });
  }, []);

  if (!profileOpen) return null;

  const dobLabel = user?.dob
    ? new Date(`${user.dob}T00:00:00`).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  const dobDraftDate = toDateFromDob(dobDraft);
  const dobDraftDisplay = dobDraftDate ? dobDraftDate.toLocaleDateString(locale) : t("common.selectDate");
  const dobMonthLabels = Array.from({ length: 12 }, (_, monthIndex) =>
    new Date(2026, monthIndex, 1).toLocaleString(locale, { month: "long" })
  );
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - DOB_YEAR_MIN + 1 }, (_, idx) => currentYear - idx);

  const openDobCalendar = () => {
    const existingDobDate = toDateFromDob(dobDraft);
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
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="relative h-full w-full max-w-md bg-black text-white border-l border-white/10 p-6 overflow-y-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display">{t("profile.title")}</h2>
            <p className="text-sm text-white/60">{user?.username || t("profile.guest")}</p>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em] text-white/50">{t("profile.dobLabel")}</span>
                {!editingDob && (
                  <button
                    type="button"
                    onClick={() => {
                      setDobDraft(user?.dob || "");
                      setEditingDob(true);
                      setDobCalendarOpen(false);
                      setDobCalendarViewDate(DOB_SAFE_VIEW_DATE);
                      setDobYearStepDone(false);
                      setDobMonthStepDone(false);
                      setError("");
                      setInfoMessage("");
                    }}
                    className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
                    aria-label={t("profile.editDobAria")}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                    {t("common.edit")}
                  </button>
                )}
              </div>
              {!editingDob ? (
                <p className="mt-1 text-sm text-white/90">{dobLabel}</p>
              ) : (
                <div className="mt-2 space-y-2">
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
                        disabled={savingDob}
                        className="dob-datepicker-trigger w-full bg-transparent text-left text-white outline-none disabled:opacity-60"
                      >
                        {dobDraftDisplay}
                      </button>
                    </div>
                  </div>
                  {dobCalendarOpen && (
                    <div className="profile-dob-wrap mt-3 w-full overflow-x-hidden rounded-2xl border border-white/10 bg-black/40 p-3">
                      {/* Clamp DOB calendar to panel viewport and scroll internally to avoid clipping on small screens. */}
                      <p className="mb-2 text-xs text-white/70">{t("auth.hints.stepFlow")}</p>
                      <div className="dob-datepicker-inline-wrap flex w-full justify-center overflow-x-hidden">
                        <DatePicker
                          inline
                          selected={dobDraftDate}
                          onChange={(date) => {
                            setDobDraft(toDobString(date));
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
                                  disabled={savingDob}
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
                                  disabled={!dobYearStepDone || savingDob}
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
                          disabled={savingDob}
                          calendarClassName="dob-datepicker-calendar"
                        />
                      </div>
                      <div className="sticky bottom-0 z-[1] mt-3 flex justify-end bg-black/55 py-1 backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => setDobCalendarOpen(false)}
                          disabled={savingDob}
                          className="rounded-lg border border-white/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-white/75 transition hover:bg-white/10 disabled:opacity-60"
                        >
                          {t("common.close")}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDobDraft(user?.dob || "");
                        setEditingDob(false);
                        setDobCalendarOpen(false);
                      }}
                      disabled={savingDob}
                      className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-60"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={saveDob}
                      disabled={savingDob}
                      className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90 disabled:opacity-60"
                    >
                      {savingDob ? t("common.saving") : t("common.save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={closeProfile}
            className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center hover:bg-white/10"
            aria-label={t("common.close")}
          >
            ×
          </button>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("profile.myAppointments")}</h3>
            <button
              onClick={logout}
              className="text-sm text-red-300 hover:text-red-200 underline"
            >
              {t("common.logout")}
            </button>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" />
              {t("profile.loadingAppointments")}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && appointments.length === 0 && (
            <p className="text-sm text-white/60">
              {t("profile.noAppointments")}
            </p>
          )}
          <ul className="space-y-3">
            {appointments.map((appt) => {
              const start = new Date(appt.appointmentDateTime);
              const dateLabel = start.toLocaleDateString(locale, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
              const timeLabel = start.toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              const isUpcoming = start.getTime() > Date.now();
              const originalDateTime = appt.appointmentDateTime;
              const changeCutoffMs = 2 * 60 * 60 * 1000;
              const locked = start.getTime() - Date.now() < changeCutoffMs;
              return (
                <li
                  key={appt._id || `${appt.appointmentDateTime}-${appt.barber}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{appt.barber}</span>
                    <span className="text-white/70">{timeLabel}</span>
                  </div>
                  <div className="text-white/80 text-sm">{dateLabel}</div>
                  <div className="text-xs text-white/50 mt-1 capitalize">
                    {appt.type === "appointment"
                      ? t("profile.types.appointment")
                      : appt.type === "break"
                      ? t("profile.types.break")
                      : t("profile.types.lock")}
                  </div>
                  {appt.type === "appointment" && isUpcoming && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => requestReschedule(appt, locked)}
                        disabled={locked}
                        className={`rounded border px-3 py-1 text-xs ${
                          locked
                            ? "border-white/10 text-white/40 cursor-not-allowed"
                            : "border-white/20 text-white hover:bg-white/5"
                        }`}
                      >
                        {t("booking.buttons.confirmChanges")}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCancel(appt._id)}
                        disabled={cancelingId === appt._id}
                        className="rounded border border-red-400 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {cancelingId === appt._id ? t("common.loading") : t("profile.messages.appointmentCancelled")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        {showToast && infoMessage && (
          <div className="pointer-events-none absolute left-1/2 bottom-6 -translate-x-1/2">
            <div
              className={`pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 shadow-lg ${
                toastType === "error" ? "bg-red-500/90" : "bg-emerald-500/90"
              }`}
            >
              <span className="text-sm font-medium text-white">{infoMessage}</span>
            </div>
          </div>
        )}
        {confirmPrompt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/90 p-5 text-white shadow-2xl">
              <h4 className="text-lg font-semibold mb-2">
                {confirmPrompt.type === "cancel" ? t("profile.messages.confirmCancelTitle") : t("profile.messages.confirmRescheduleTitle")}
              </h4>
              <p className="text-sm text-white/70 mb-4">
                {confirmPrompt.type === "cancel"
                  ? t("profile.messages.confirmCancelBody")
                  : t("profile.messages.confirmRescheduleBody")}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmPrompt(null)}
                  className="rounded border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmPrompt.type === "cancel") {
                      performCancel(confirmPrompt.id);
                    } else if (confirmPrompt.type === "reschedule") {
                      performReschedule(confirmPrompt.appt, confirmPrompt.locked);
                    }
                    setConfirmPrompt(null);
                  }}
                  className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-neutral-200"
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
