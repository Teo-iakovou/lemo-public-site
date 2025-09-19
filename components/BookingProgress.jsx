import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const steps = [
  { href: "/book", label: "Service" },
  { href: "/book/date", label: "Date" },
  { href: "/book/time", label: "Time" },
  { href: "/book/details", label: "Details" },
  { href: "/book/confirm", label: "Confirm" },
];

export default function BookingProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString();
  return (
    <nav className="flex gap-2 my-2 mb-4">
      {steps.map((s) => {
        const active = pathname.startsWith(s.href);
        const href = qs ? `${s.href}?${qs}` : s.href;
        const base =
          "px-3 py-1.5 rounded-full border text-sm no-underline transition-colors";
        const cls = active
          ? `${base} bg-black text-white border-black`
          : `${base} border-neutral-200 hover:bg-neutral-100`;
        return (
          <Link key={s.href} href={href} className={cls}>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
