export default function Footer() {
  return (
    <footer id="footer" className="border-t border-white/10 mt-20">
      <div className="container-xl py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm muted">© {new Date().getFullYear()} Lemo Barbershop</p>
        <div className="text-sm flex gap-6 items-center">
          <a
            href="https://www.instagram.com/lemobarbershop?igsh=enh6M2J4OHdlaGg3"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:opacity-80"
            title="Instagram"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm5.75-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z"/>
            </svg>
          </a>
          <a href="tel:+35799884716" aria-label="Κλήση +357 99884716" className="hover:opacity-80" title="Κλήση">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M6.62 10.79a15.53 15.53 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.56.57 1 1 0 0 1 1 1v3.49a1 1 0 0 1-1 1A17.5 17.5 0 0 1 2.5 6a1 1 0 0 1 1-1H7a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.56 1 1 0 0 1-.24 1.01l-1.7 1.22z"/>
            </svg>
          </a>
          <a href="mailto:hello@lemo.barber" aria-label="Email" className="hover:opacity-80" title="Email">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.01L12 13l8-5.99V7H4zm16 10V9.2l-7.44 5.57a1 1 0 0 1-1.12 0L4 9.2V17h16z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
