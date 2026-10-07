"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Field, FormError, SubmitButton, send } from "./fields";

const link = "font-semibold text-[#113858] underline-offset-4 hover:underline";

// Where to go after signing in: the page they were sent from if there was one (same-site paths only), otherwise the homepage
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

function useSubmit(action: (f: Record<string, string>) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError("");
    try {
      await action(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  };
  return { busy, error, onSubmit };
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { busy, error, onSubmit } = useSubmit(async (f) => {
    const res = await send<{ admin?: boolean; superadmin?: boolean }>("/api/auth/login", { email: f.email, password: f.password });
    router.replace(res?.superadmin && next.startsWith("/superadmin") ? next : res?.admin ? "/admin" : next);
    router.refresh();
  });
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5">
      <Field id="email" label="Email address" type="email" required autoComplete="email" placeholder="name@company.com" />
      <div>
        <Field id="password" label="Password" type="password" required autoComplete="current-password" placeholder="Your password" />
        <div className="mt-2 text-right text-[13px]">
          <Link href="/forgot-password" className={link}>
            Forgot password?
          </Link>
        </div>
      </div>
      <FormError message={error} />
      <SubmitButton busy={busy}>Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { busy, error, onSubmit } = useSubmit(async (f) => {
    await send("/api/auth/register", f);
    router.replace("/");
    router.refresh();
  });
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="firstName" label="First name" required autoComplete="given-name" placeholder="First name" />
        <Field id="lastName" label="Last name" autoComplete="family-name" placeholder="Last name" />
      </div>
      <Field id="email" label="Email address" type="email" required autoComplete="email" placeholder="name@company.com" />
      <Field id="phone" label="Phone" type="tel" autoComplete="tel" placeholder="+91 00000 00000" />
      <Field id="password" label="Password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      <FormError message={error} />
      <SubmitButton busy={busy}>Create account</SubmitButton>
      <p className="text-center text-[12.5px] text-[#607487]">
        By creating an account you agree to be contacted about your orders.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState("");
  const { busy, error, onSubmit } = useSubmit(async (f) => {
    await send("/api/auth/forgot-password", { email: f.email });
    setSent(f.email);
  });
  if (sent)
    return (
      <div className="rounded-2xl bg-[#F5F8FA] p-6">
        <div className="flex items-center gap-3 text-[#113858]">
          <CheckCircle2 className="size-6 text-emerald-500" />
          <h2 className="text-lg font-semibold">Check your inbox</h2>
        </div>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[#607487]">
          If an account exists for <strong className="text-[#113858]">{sent}</strong>, we have sent a link to reset your password.
        </p>
      </div>
    );
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5">
      <Field id="email" label="Email address" type="email" required autoComplete="email" placeholder="name@company.com" />
      <FormError message={error} />
      <SubmitButton busy={busy}>Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [done, setDone] = useState(false);
  const { busy, error, onSubmit } = useSubmit(async (f) => {
    if (f.password !== f.confirm) throw new Error("Passwords do not match");
    await send("/api/auth/reset-password", { token, email, password: f.password });
    setDone(true);
  });

  if (!token || !email)
    return (
      <p className="text-[15px] text-[#607487]">
        This reset link is invalid or incomplete.{" "}
        <Link href="/forgot-password" className={link}>
          Request a new one
        </Link>
        .
      </p>
    );
  if (done)
    return (
      <div className="rounded-2xl bg-[#F5F8FA] p-6">
        <div className="flex items-center gap-3 text-[#113858]">
          <CheckCircle2 className="size-6 text-emerald-500" />
          <h2 className="text-lg font-semibold">Password updated</h2>
        </div>
        <Link
          href="/login"
          className="mt-5 inline-flex h-[46px] items-center rounded-full bg-[#113858] px-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#0b243a]"
        >
          Sign in
        </Link>
      </div>
    );
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-5">
      <Field id="password" label="New password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      <Field id="confirm" label="Confirm password" type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat password" />
      <FormError message={error} />
      <SubmitButton busy={busy}>Update password</SubmitButton>
    </form>
  );
}
