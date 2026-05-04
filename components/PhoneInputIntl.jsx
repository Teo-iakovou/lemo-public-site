"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const COUNTRIES = [
  { code: "CY", name: "Cyprus", dial: "+357", flag: "🇨🇾" },
  { code: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { code: "AL", name: "Albania", dial: "+355", flag: "🇦🇱" },
  { code: "AD", name: "Andorra", dial: "+376", flag: "🇦🇩" },
  { code: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { code: "BY", name: "Belarus", dial: "+375", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "BA", name: "Bosnia & Herzegovina", dial: "+387", flag: "🇧🇦" },
  { code: "BG", name: "Bulgaria", dial: "+359", flag: "🇧🇬" },
  { code: "HR", name: "Croatia", dial: "+385", flag: "🇭🇷" },
  { code: "CZ", name: "Czechia", dial: "+420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { code: "EE", name: "Estonia", dial: "+372", flag: "🇪🇪" },
  { code: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "GI", name: "Gibraltar", dial: "+350", flag: "🇬🇮" },
  { code: "HU", name: "Hungary", dial: "+36", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", dial: "+354", flag: "🇮🇸" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "XK", name: "Kosovo", dial: "+383", flag: "🇽🇰" },
  { code: "LV", name: "Latvia", dial: "+371", flag: "🇱🇻" },
  { code: "LI", name: "Liechtenstein", dial: "+423", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", dial: "+370", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { code: "MT", name: "Malta", dial: "+356", flag: "🇲🇹" },
  { code: "MD", name: "Moldova", dial: "+373", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", dial: "+377", flag: "🇲🇨" },
  { code: "ME", name: "Montenegro", dial: "+382", flag: "🇲🇪" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "MK", name: "North Macedonia", dial: "+389", flag: "🇲🇰" },
  { code: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { code: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { code: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
  { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { code: "SM", name: "San Marino", dial: "+378", flag: "🇸🇲" },
  { code: "RS", name: "Serbia", dial: "+381", flag: "🇷🇸" },
  { code: "SK", name: "Slovakia", dial: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", dial: "+386", flag: "🇸🇮" },
  { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", dial: "+380", flag: "🇺🇦" },
  { code: "VA", name: "Vatican City", dial: "+379", flag: "🇻🇦" },
];

function digitsOnly(s = "") {
  return String(s).replace(/\D+/g, "");
}

export default function PhoneInputIntl({ value, onChange, defaultCountry = "CY", id }) {
  const inputRef = useRef(null);
  const defaultIndex = Math.max(0, COUNTRIES.findIndex((c) => c.code === defaultCountry));
  const [dial, setDial] = useState(COUNTRIES[defaultIndex].dial); // e.g., "+357"
  const [local, setLocal] = useState(""); // local digits only
  const lastNormalizedRef = useRef("");

  // Initialize from value
  useEffect(() => {
    if (value == null) return;
    const v = String(value).replace(/\s+/g, "");
    if (v === lastNormalizedRef.current) return;
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
    lastNormalizedRef.current = v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Emit combined number on changes
  useEffect(() => {
    const combined = `${dial}${digitsOnly(local)}`;
    if (combined === lastNormalizedRef.current) {
      onChange && onChange(combined);
      return;
    }
    lastNormalizedRef.current = combined;
    onChange && onChange(combined);
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
