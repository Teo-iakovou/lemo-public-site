"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function AuthModal() {
  const { modalState, closeAuthModal, authenticate, setAuthMode } = useAuth();
  const { open, mode, loading, error } = modalState;
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setPassword("");
      setFormError("");
    }
  }, [open]);

  useEffect(() => {
    setFormError("");
    setPassword("");
    if (mode === "signup") {
      setName((prev) => prev.trim());
    }
  }, [mode]);

  if (!open) return null;

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    const trimmedName = name.trim();
    if (!trimmedName || !password) {
      setFormError("Συμπληρώστε όνομα και κωδικό.");
      return;
    }
    try {
      await authenticate({ mode, name: trimmedName, password });
      setName("");
      setPassword("");
    } catch (err) {
      setFormError(err.message || "Κάτι πήγε στραβά.");
    }
  };

  const heading = mode === "signup" ? "Δημιουργία Λογαριασμού" : "Σύνδεση";
  const cta = mode === "signup" ? "Εγγραφή" : "Σύνδεση";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/90 p-6 shadow-xl">
        <h2 className="text-xl font-display text-white mb-4 text-center">{heading}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">
              Όνομα
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
              placeholder="Το όνομά σας"
              autoFocus
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-1">
              Κωδικός
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {(formError || error) && (
            <p className="text-sm text-red-400">{formError || error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 py-2 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-60"
          >
            {loading ? "Επεξεργασία..." : cta}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-white/60">
          {mode === "signup" ? (
            <>
              Έχετε ήδη λογαριασμό;{" "}
              <button
                type="button"
                className="text-purple-300 hover:text-purple-200 underline"
                onClick={() => setAuthMode("login")}
              >
                Συνδεθείτε
              </button>
            </>
          ) : (
            <>
              Δεν έχετε λογαριασμό;{" "}
              <button
                type="button"
                className="text-purple-300 hover:text-purple-200 underline"
                onClick={() => setAuthMode("signup")}
              >
                Δημιουργία
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={closeAuthModal}
          className="mt-6 block w-full rounded-lg border border-white/10 py-2 text-sm text-white/80 hover:bg-white/10"
          disabled={loading}
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
}
