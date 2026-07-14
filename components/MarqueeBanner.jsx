function Row({ variant = "light", reverse = false, items }) {
  const sequence = Array.from({ length: 14 }).flatMap((_, i) =>
    items.map((text, j) => (
      <span key={`${i}-${j}`} className="mx-6">
        {text}
      </span>
    ))
  );
  const base =
    "marquee__inner text-lg sm:text-xl md:text-2xl uppercase font-graffiti graffiti";
  const color = variant === "light" ? "text-black" : "text-white";
  const cls = `${base} ${color}`;
  return (
    <div className={`marquee ${reverse ? "marquee--reverse" : ""}`}>
      <div className={cls}>
        <div className="marquee__content">{sequence}</div>
        <div className="marquee__content" aria-hidden>
          {sequence}
        </div>
      </div>
    </div>
  );
}

export default function MarqueeBanner({ items = ["LEMOBARBERSHOP"] }) {
  return (
    <section aria-label="Scrolling banner" className="py-6">
      {/* Light stripe on violet background */}
      <div className="rounded-none bg-purple-600 border-y border-black/20 py-3 select-none">
        <Row variant="light" reverse={false} items={items} />
      </div>

      {/* Dark stripe on transparent background */}
      <div className="border-b border-white/10 py-3 select-none">
        <Row variant="dark" reverse={true} items={items} />
      </div>
    </section>
  );
}
