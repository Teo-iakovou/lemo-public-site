function Row({ variant = "light", reverse = false }) {
  const items = Array.from({ length: 14 }).map((_, i) => (
    <span key={i} className="mx-6">
      LEMOBARBERSHOP
    </span>
  ));
  const base =
    "marquee__inner text-lg sm:text-xl md:text-2xl uppercase font-graffiti graffiti";
  const color = variant === "light" ? "text-black" : "text-white";
  const cls = `${base} ${color}`;
  return (
    <div className={`marquee ${reverse ? "marquee--reverse" : ""}`}>
      <div className={cls}>
        <div className="marquee__content">{items}</div>
        <div className="marquee__content" aria-hidden>
          {items}
        </div>
      </div>
    </div>
  );
}

export default function MarqueeBanner() {
  return (
    <section aria-label="Scrolling banner" className="py-6">
      {/* Light stripe on white background */}
      <div className="rounded-none bg-purple-600 border-y border-black/20 py-3 select-none">
        <Row variant="light" reverse={false} />
      </div>

      {/* Dark stripe on transparent background */}
      <div className="border-b border-white/10 py-3 select-none">
        <Row variant="dark" reverse={true} />
      </div>
    </section>
  );
}
