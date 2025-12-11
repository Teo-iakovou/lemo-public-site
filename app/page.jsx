"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import MarqueeBanner from "../components/MarqueeBanner";
import Reveal from "../components/Reveal";
import BookingModal from "../components/BookingModal";
import { useCallback, useEffect, useState } from "react";
import IntroOverlay from "../components/IntroOverlay";
import { useAuth } from "../components/AuthProvider";

export default function Home() {
  // Client-only bits for modal open are safe in the app router
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [editAppointment, setEditAppointment] = useState(null);
  const { requireAuth } = useAuth();

  const openBooking = useCallback(
    (options = {}) => {
      const detail = options?.detail ? options.detail : options;
      requireAuth(() => {
        setEditAppointment(detail?.editAppointment || null);
        setOpen(true);
      });
    },
    [requireAuth]
  );

  const handleOpenClick = useCallback(() => openBooking(), [openBooking]);

  const handleCloseBooking = useCallback(() => {
    setOpen(false);
    setEditAppointment(null);
  }, []);

  useEffect(() => {
    const handler = (event) => openBooking(event?.detail || {});
    window.addEventListener("open-booking", handler);
    return () => window.removeEventListener("open-booking", handler);
  }, [openBooking]);
  // Always land at the hero on reload/navigation and avoid restoring prior scroll
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { history.scrollRestoration = 'manual'; } catch {}
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);
  const ADDRESS = "Lemo Barber Shop (MXQ4+7J Ύψωνας, Κύπρος)";
  const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&z=16&output=embed`;
  const MAPS_URL =
    "https://www.google.com/maps/place/Lemo+Barber+Shop/@34.6882371,32.9540037,17z/data=!3m1!4b1!4m6!3m5!1s0x14e73166eb7c34f9:0x765fcbab2e6fed5b!8m2!3d34.6882327!4d32.9565786!16s%2Fg%2F11ml9hpzfn?entry=ttu";
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
              <button onClick={handleOpenClick} className="btn btn-primary btn-gang font-display tracking-tight whitespace-nowrap">ΚΛΕΙΣΤΕ ΡΑΝΤΕΒΟΥ</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Removed standalone hours strip; merged later with booking CTA */}

      {/* Services */}
      <section id="services" className="section">
        <Reveal as="div" className="container-xl">
          <h2 className="font-display text-4xl mb-8">Υπηρεσίες & Τιμές</h2>
          <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
            {[
              { name: "Κούρεμα", price: "€10–€15" },
            ].map((s) => (
              <Reveal key={s.name} delay={100} className="p-6 border border-white/10 rounded-lg bg-white/5">
                <div className="flex items-end justify-between">
                  <h3 className="text-xl font-display">{s.name}</h3>
                  <span className="text-lg">{s.price}</span>
                </div>
                <button onClick={handleOpenClick} className="inline-block mt-4 text-sm underline">Κράτηση →</button>
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
          <h2 className="font-display text-4xl mb-6">Τοποθεσία</h2>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10">
            <iframe
              title="Χάρτης"
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={MAPS_EMBED}
            />
            <div className="absolute top-2 right-2">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline px-3 py-1 text-sm"
              >
                Άνοιγμα στο Google Maps
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Merged Booking + Hours just before footer */}
      <section id="booking-hours" className="section pt-0">
        <Reveal as="div" className="container-xl grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="font-display text-4xl mb-3">Κλείστε ραντεβού</h2>
            <p className="muted mb-4">Δεχόμαστε χωρίς ραντεβού όταν υπάρχει διαθεσιμότητα. Συνιστάται η κράτηση.</p>

          </div>
          <div>
            <h2 className="font-display text-2xl mb-2">Ώρες Λειτουργίας</h2>
            <ul className="muted leading-7">
              <li>Τρ–Παρ: 09:00–19:00</li>
              <li>Σαβ: 09:00–17:40</li>
              <li>Κυρ–Δευ: Κλειστά</li>
            </ul>
          </div>
        </Reveal>
      </section>

      <Footer />
      <BookingModal open={open} onClose={handleCloseBooking} editAppointment={editAppointment} />
    </div>
  );
}
