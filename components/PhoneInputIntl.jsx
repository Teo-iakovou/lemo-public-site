"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const COUNTRIES = [
  { code: "CY", name: "Cyprus", dial: "+357", flag: "🇨🇾" },
  { code: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
];

function digitsOnly(s = "") {
  return String(s).replace(/\D+/g, "");
}

export default function PhoneInputIntl({ value, onChange, defaultCountry = "CY", id }) {
  const inputRef = useRef(null);
  const defaultIndex = Math.max(0, COUNTRIES.findIndex((c) => c.code === defaultCountry));
  const [dial, setDial] = useState(COUNTRIES[defaultIndex].dial); // e.g., "+357"
  const [local, setLocal] = useState(""); // local digits only

  // Initialize from value
  useEffect(() => {
    if (value == null) return;
    const v = String(value).replace(/\s+/g, "");
    const found = COUNTRIES.find((c) => v.startsWith(c.dial));
    if (found) {
      const nextDial = found.dial;
      const nextLocal = digitsOnly(v.slice(found.dial.length));
      setDial((currentDial) => (currentDial === nextDial ? currentDial : nextDial));
      setLocal((currentLocal) => (currentLocal === nextLocal ? currentLocal : nextLocal));
    } else if (v.trim()) {
      const nextLocal = digitsOnly(v);
      setLocal((currentLocal) => (currentLocal === nextLocal ? currentLocal : nextLocal));
    } else {
      setLocal("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Emit combined number on changes
  useEffect(() => {
    onChange && onChange(`${dial}${digitsOnly(local)}`);
  }, [dial, local, onChange]);

  function onDialChange(nextDial) {
    setDial(nextDial);
    // Keep local as-is; combined will update via effect
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const current = useMemo(() => COUNTRIES.find((c) => c.dial === dial) || COUNTRIES[defaultIndex], [dial]);

  return (
    <div className="mt-1 flex items-stretch rounded-md border border-white/10 overflow-hidden bg-white/5 text-white focus-within:border-purple-500">
      {/* Left: country selector with dial code */}
      <div className="relative flex items-center gap-2 pl-2 pr-3 bg-white/5">
        <span className="text-lg" aria-hidden>{current.flag}</span>
        <span className="text-sm opacity-90 select-none">{dial}</span>
        {/* Invisible select overlay to capture clicks */}
        <select
          aria-label="Country dial code"
          className="absolute inset-0 opacity-0 cursor-pointer"
          value={dial}
          onChange={(e) => onDialChange(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>{`${c.flag} ${c.name} (${c.dial})`}</option>
          ))}
        </select>
      </div>
      {/* Vertical divider */}
      <div className="w-px bg-white/10" aria-hidden />
      {/* Right: local number */}
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="tel"
        placeholder="99 123456"
        className="flex-1 px-2 py-2 bg-transparent text-white focus:outline-none"
        value={local}
        onChange={(e) => setLocal(digitsOnly(e.target.value))}
        required
      />
    </div>
  );
}
