"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import MarqueeBanner from "../components/MarqueeBanner";
import BookingModal from "../components/BookingModal";
import { useEffect, useState } from "react";
import IntroOverlay from "../components/IntroOverlay";

export default function Home() {
  // Client-only bits for modal open are safe in the app router
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-booking", handler);
    return () => window.removeEventListener("open-booking", handler);
  }, []);
  const ADDRESS = "Parodos Elia Venezi 25A, 4180 Ypsonas";
  const LAT = 34.6881935;
  const LNG = 32.9566240;
  // Use precise coordinates, but display the address as the label
  const MAPS_URL =
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${LAT},${LNG} (${ADDRESS})`);
  // Public asset hero image (placed in public/)
  const HERO_URL = "/LemoBarberShop.JPG";
  return (
    <div className="min-h-screen">
      {intro && <IntroOverlay onDone={() => setIntro(false)} />}
      <Header />

      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-[88vh] overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              `linear-gradient(180deg, rgba(0,0,0,.5), rgba(0,0,0,.7)), url(${HERO_URL})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container-xl text-center space-y-6">
          <h1
            className="font-display font-black text-center leading-none tracking-tight text-white"
            aria-label="LEMOBARBERSHOP"
          >
            <span className="block text-[12vw] sm:text-[14vw] md:text-[120px] lg:text-[140px]">
              {Array.from("LEMOBARBERSHOP").map((ch, i) => {
                // V-shaped opacity: edges darker (more opaque), center more transparent
                const steps = [
                  "text-white/90", // L
                  "text-white/80", // E
                  "text-white/70", // M
                  "text-white/60", // O
                  "text-white/50", // B
                  "text-white/40", // A
                  "text-white/30", // R (first)
                  "text-white/30", // B (second)
                  "text-white/40", // E
                  "text-white/50", // R
                  "text-white/60", // S
                  "text-white/70", // H
                  "text-white/80", // O
                  "text-white/90", // P
                ];
                return (
                  <span key={i} className={steps[i]}>
                    {ch}
                  </span>
                );
              })}
            </span>
          </h1>
          <p className="text-base sm:text-lg muted max-w-2xl mx-auto">
            Precision cuts. Clean fades. Since 2022.
          </p>
          <div className="flex items-center justify-center">
            <button onClick={() => setOpen(true)} className="btn btn-primary">Book Now</button>
          </div>
        </div>
      </section>

      {/* Removed standalone hours strip; merged later with booking CTA */}

      {/* Services */}
      <section id="services" className="section">
        <div className="container-xl">
          <h2 className="font-display text-4xl mb-8">Services & Prices</h2>
          <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
            {[
              { name: "Haircut", price: "€15" },
            ].map((s) => (
              <div key={s.name} className="p-6 border border-white/10 rounded-lg bg-white/5">
                <div className="flex items-end justify-between">
                  <h3 className="text-xl font-display">{s.name}</h3>
                  <span className="text-lg">{s.price}</span>
                </div>
                <button onClick={() => setOpen(true)} className="inline-block mt-4 text-sm underline">Book →</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive stripes banner */}
      <MarqueeBanner />

      {/* Map */}
      <section id="location" className="section pt-0">
        <div className="container-xl">
          <h2 className="font-display text-4xl mb-6">Location</h2>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10">
            <iframe
              title="Map"
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              // Embed with coordinates for accuracy but show the address as label
              src={`https://www.google.com/maps?q=${encodeURIComponent(`loc:${LAT},${LNG} (${ADDRESS})`)}&z=16&output=embed`}
            />
            <div className="absolute top-2 right-2">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline px-3 py-1 text-sm"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Merged Booking + Hours just before footer */}
      <section id="booking-hours" className="section pt-0">
        <div className="container-xl grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="font-display text-4xl mb-3">Book with us</h2>
            <p className="muted mb-4">Walk-ins welcome when available. Booking recommended.</p>

          </div>
          <div>
            <h2 className="font-display text-2xl mb-2">Opening Hours</h2>
            <ul className="muted leading-7">
              <li>Tue–Sat: 09:00–19:00</li>
              <li>Sun–Mon: Closed</li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />
      <BookingModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
