const WHATSAPP = "https://wa.me/919892297764?text=Hi%2C%20I%20have%20a%20requirement";

export function WhatsappCta({
  title = "Got a Question?",
  body = "We're here to help you with sizes, customization, and bulk orders.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center justify-between gap-4 rounded-[28px] bg-[#E9F0F5] px-6 py-8 sm:flex-row sm:px-10">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#113858] sm:text-[26px]">{title}</h2>
          <p className="mt-2 text-sm text-[#607487] sm:text-base">{body}</p>
        </div>
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-2 rounded-full bg-[#113858] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#0b243a]"
        >
          <svg viewBox="0 0 24 24" fill="white" className="size-6" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.85 9.85 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.64-.6-2.89-1.25-4.78-4.16-4.92-4.35-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.77-.36.19 0 .39 0 .55.01.18.01.42-.07.65.5.24.58.81 2 .88 2.15.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.16-.29.36-.42.48-.14.13-.28.28-.12.55.16.27.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.21 1.37.27.14.42.12.58-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.55.73 1.82.86.27.13.45.2.51.31.07.11.07.63-.17 1.31Z" />
          </svg>
          WhatsApp Us
        </a>
      </div>
    </div>
  );
}
