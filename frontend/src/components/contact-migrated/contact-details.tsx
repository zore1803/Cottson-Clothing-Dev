"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    value: "contact@cottson.com",
    href: "mailto:contact@cottson.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 98922 97764 / 022 26627501",
    href: "tel:+919892297764",
  },
  {
    icon: MapPin,
    label: "Visit Us",
    value: "No. 721, Centura Square IT Park, Road No. 27, Wagle Estate, Thane (W) - 400604, Maharashtra, India",
    href: "#",
  },
];

export function ContactDetails() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        }),
      });

      setBusy(false);

      if (res.ok) {
        setSent(true);
      } else {
        toast.error("Could not send your request, please try again");
      }
    } catch {
      setBusy(false);
      toast.error("Could not send your request, please try again");
    }
  };

  return (
    <section id="query" className="bg-white px-6 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-[1120px] gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        {/* LEFT — CONTACT DETAILS */}
        <div className="rounded-[28px] bg-white p-6 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#607487]">
            Get in touch
          </p>

          <h2 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#113858] sm:text-[50px]">
            Let&apos;s start a
            <br />
            conversation.
          </h2>

          <div className="mt-12 space-y-8">
            {contactDetails.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="group flex items-start gap-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F5F8FA] text-[#113858] transition-colors duration-300 group-hover:bg-[#113858] group-hover:text-white">
                    <Icon size={18} strokeWidth={1.6} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#607487]">
                      {item.label}
                    </p>

                    <p className="mt-1 text-[15px] font-medium text-[#113858] sm:text-[16px] leading-relaxed">
                      {item.value}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* RIGHT — CONTACT FORM (Preserving Repo 1 /api/quotes Mongo backend) */}
        <div className="rounded-[28px] bg-[#113858] p-8 sm:p-10 lg:p-12 shadow-xl shadow-[#113858]/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Send a query
          </p>

          <h3 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-white sm:text-[38px]">
            Tell us what you&apos;re looking for.
          </h3>

          {sent ? (
            <div className="mt-10 rounded-2xl bg-white/10 p-8 text-white backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 text-emerald-400" />
                <h4 className="text-lg font-semibold">Thank you for reaching out!</h4>
              </div>
              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                Our brand specialist team has received your query and will get back to you within one working day.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setFormData({ firstName: "", lastName: "", email: "", phone: "", message: "" });
                }}
                className="mt-6 rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-[#113858] hover:bg-slate-100"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10">
              {/* First Name + Last Name */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="border-b border-white/20 pb-1">
                  <label
                    htmlFor="firstName"
                    className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60"
                  >
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First name"
                    className="mt-2 w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/40"
                  />
                </div>

                <div className="border-b border-white/20 pb-1">
                  <label
                    htmlFor="lastName"
                    className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last name"
                    className="mt-2 w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/40"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="border-b border-white/20 pb-1">
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60"
                  >
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="mt-2 w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/40"
                  />
                </div>

                <div className="border-b border-white/20 pb-1">
                  <label
                    htmlFor="phone"
                    className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 00000 00000"
                    className="mt-2 w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/40"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="mt-7 border-b border-white/20 pb-1">
                <label
                  htmlFor="message"
                  className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60"
                >
                  Your Requirement *
                </label>
                <textarea
                  id="message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about the apparel styles, estimated quantity (25+), logo branding…"
                  className="mt-2 w-full resize-none bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-white/40"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="
                  mt-9 inline-flex h-[52px] min-w-[180px]
                  items-center justify-center
                  rounded-full
                  bg-white
                  px-8
                  text-[13px] font-semibold uppercase tracking-[0.08em]
                  text-[#113858]
                  transition-all duration-300
                  hover:-translate-y-0.5
                  hover:bg-[#F5F8FA]
                  disabled:opacity-60
                  cursor-pointer
                "
              >
                {busy ? "Sending..." : "Send Query"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default ContactDetails;
