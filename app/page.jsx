"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Reveal from "../components/Reveal";
import BookingModal from "../components/BookingModal";
import TeamShowcase from "../components/TeamShowcase";
import { useCallback, useEffect, useState } from "react";
import IntroOverlay from "../components/IntroOverlay";
import { useAuth } from "../components/AuthProvider";
import { useLanguage } from "../components/LanguageProvider";

export default function Home() {
  // Client-only bits for modal open are safe in the app router
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [editAppointment, setEditAppointment] = useState(null);
  const { requireAuth } = useAuth();
  const { t } = useLanguage();

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
  const MAP_COORDS = "34.688222,32.956536";
  const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(MAP_COORDS)}&z=16&output=embed`;
  const MAPS_URL = `https://www.google.com/maps?q=${encodeURIComponent(MAP_COORDS)}`;
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
              <button onClick={handleOpenClick} className="btn btn-primary btn-gang font-display tracking-tight whitespace-nowrap">{t("home.bookNow")}</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Removed standalone hours strip; merged later with booking CTA */}

      {/* Team (contains its own marquee divider) */}
      <TeamShowcase />

      {/* Map */}
      <section id="location" className="section pt-0">
        <Reveal as="div" className="container-xl">
          <h2 className="font-display text-4xl mb-6">{t("home.location")}</h2>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10">
            <iframe
              title={t("home.mapTitle")}
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
                {t("home.openGoogleMaps")}
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Merged Booking + Hours just before footer */}
      <section id="booking-hours" className="section pt-0">
        <Reveal as="div" className="container-xl grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="font-display text-4xl mb-3">{t("home.bookAppointment")}</h2>
            <p className="muted mb-4">{t("home.walkinText")}</p>

          </div>
          <div>
            <h2 className="font-display text-2xl mb-2">{t("home.openingHours")}</h2>
            <ul className="muted leading-7">
              <li>{t("home.hoursTueFri")}</li>
              <li>{t("home.hoursSat")}</li>
              <li>{t("home.hoursSunMon")}</li>
            </ul>
          </div>
        </Reveal>
      </section>

      <Footer />
      <BookingModal open={open} onClose={handleCloseBooking} editAppointment={editAppointment} />
    </div>
  );
}
