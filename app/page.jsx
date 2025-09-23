"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import MarqueeBanner from "../components/MarqueeBanner";
import Reveal from "../components/Reveal";
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
  // Always land at the hero on reload/navigation and avoid restoring prior scroll
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { history.scrollRestoration = 'manual'; } catch {}
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);
  const ADDRESS = "Parodos Elia Venezi 25A, 4180 Ypsonas";
  const LAT = 34.6881935;
  const LNG = 32.9566240;
  // Use precise coordinates, but display the address as the label
  const MAPS_URL =
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${LAT},${LNG} (${ADDRESS})`);
  // Public asset hero image (placed in public/)
  const HERO_URL = "/FFF725C7-B78F-4BCC-A8E4-9DAB7FC156C0.JPG";
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
        <div className="container-xl text-center space-y-6 -mt-4 sm:-mt-8">
          <Reveal>
            <h1
              className="font-display font-black text-center leading-none tracking-tight text-white"
              aria-label="LEMOBARBERSHOP"
            >
              <span className="block text-[10vw] sm:text-[12vw] md:text-[100px] lg:text-[120px]">
                {Array.from("LEMOBARBERSHOP").map((ch, i) => {
                  const steps = [
                    "text-white/90",
                    "text-white/80",
                    "text-white/70",
                    "text-white/60",
                    "text-white/50",
                    "text-white/40",
                    "text-white/30",
                    "text-white/30",
                    "text-white/40",
                    "text-white/50",
                    "text-white/60",
                    "text-white/70",
                    "text-white/80",
                    "text-white/90",
                  ];
                  return (
                    <span key={i} className={steps[i]}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <div className="flex items-center justify-center">
              <button onClick={() => setOpen(true)} className="btn btn-primary">Book Now</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Removed standalone hours strip; merged later with booking CTA */}

      {/* Services */}
      <section id="services" className="section">
        <Reveal as="div" className="container-xl">
          <h2 className="font-display text-4xl mb-8">Services & Prices</h2>
          <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
            {[
              { name: "Haircut", price: "€15" },
            ].map((s) => (
              <Reveal key={s.name} delay={100} className="p-6 border border-white/10 rounded-lg bg-white/5">
                <div className="flex items-end justify-between">
                  <h3 className="text-xl font-display">{s.name}</h3>
                  <span className="text-lg">{s.price}</span>
                </div>
                <button onClick={() => setOpen(true)} className="inline-block mt-4 text-sm underline">Book →</button>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Interactive stripes banner */}
      <Reveal as="div">
        <MarqueeBanner />
      </Reveal>

      {/* Map */}
      <section id="location" className="section pt-0">
        <Reveal as="div" className="container-xl">
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
        </Reveal>
      </section>

      {/* Merged Booking + Hours just before footer */}
      <section id="booking-hours" className="section pt-0">
        <Reveal as="div" className="container-xl grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
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
        </Reveal>
      </section>

      <Footer />
      <BookingModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
