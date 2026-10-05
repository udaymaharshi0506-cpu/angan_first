"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Home,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { apiFetch, useApp, type SessionUser } from "@/components/providers";

// ─────────────────────────────────────────────────────────
// SignupExperience
// Phone-OTP based registration. Creates a new account on
// first-time verify, then routes to /setup for profile
// completion. Existing users are transparently logged in.
// ─────────────────────────────────────────────────────────
export function SignupExperience({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const { refreshUser, demoMode, toast } = useApp();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");

  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // ── Step 1: request OTP ───────────────────────────────
  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch<{ demoCode?: string }>(
        "/api/auth/otp/request",
        {
          method: "POST",
          body: JSON.stringify({ phone: `+91${phone.replace(/\D/g, "")}` }),
        }
      );
      setDemoCode(data.demoCode || "");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your code.");
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2: verify OTP, create/sign-in user ───────────
  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await apiFetch<{ user: SessionUser }>(
        "/api/auth/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({ phone: `+91${phone}`, code }),
        }
      );
      await refreshUser();
      // Always go to setup on signup so users fill in their profile
      router.push(
        `/setup?next=${encodeURIComponent(
          data.user.needsOnboarding ? destination : destination
        )}`
      );
      router.refresh();
      toast("Welcome to Aangan! Let's set up your profile.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't verify your code."
      );
    } finally {
      setBusy(false);
    }
  }

  // ── Demo quick-start ──────────────────────────────────
  async function demoSignIn(role: "customer" | "owner") {
    setError("");
    setBusy(true);
    try {
      await apiFetch("/api/auth/demo", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      await refreshUser();
      router.push(
        role === "owner" && destination === "/" ? "/owner" : destination
      );
      router.refresh();
      toast(
        role === "owner"
          ? "Welcome to your owner dashboard"
          : "Welcome home!"
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't open demo account."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        {/* ── Left: form ─────────────────────────────── */}
        <div className="auth-form-side">
          <Link href="/login" className="auth-back">
            <ArrowLeft size={16} /> Already have an account? Log in
          </Link>

          <div className="auth-form-inner">
            <span className="auth-symbol">
              <UserPlus size={26} />
            </span>

            <span className="eyebrow">
              <span className="eyebrow-line" /> CREATE YOUR ACCOUNT
            </span>

            <h1>
              {step === "phone" ? (
                <>
                  Your journey<br />
                  <em>begins here.</em>
                </>
              ) : (
                <>
                  One quick<br />
                  <em>verification.</em>
                </>
              )}
            </h1>

            <p>
              {step === "phone"
                ? "Sign up with your mobile number — no passwords, no spam. You're just a tap away from your next place."
                : `We sent a 6-digit code to +91 ${phone}. Enter it below to activate your account.`}
            </p>

            {/* ── Phone form ──────────────────────────── */}
            {step === "phone" ? (
              <form onSubmit={(e) => void requestCode(e)}>
                <label className="form-label">MOBILE NUMBER</label>
                <div className="phone-field">
                  <span>🇮🇳 &nbsp; +91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    maxLength={10}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter 10-digit number"
                    required
                    aria-label="Mobile number for signup"
                    id="signup-phone"
                  />
                </div>
                <button
                  id="signup-send-code-btn"
                  className="btn btn-primary btn-full"
                  disabled={busy || phone.length !== 10}
                >
                  {busy ? "Sending code…" : "Create my account"}{" "}
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              /* ── OTP form ──────────────────────────── */
              <form onSubmit={(e) => void verifyCode(e)}>
                <label className="form-label">VERIFICATION CODE</label>
                <input
                  id="signup-otp-input"
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  autoFocus
                  required
                  aria-label="6-digit verification code"
                />
                {demoCode && (
                  <p className="demo-otp-hint">
                    Preview code: <strong>{demoCode}</strong>
                  </p>
                )}
                <button
                  id="signup-verify-btn"
                  className="btn btn-primary btn-full"
                  disabled={busy || code.length !== 6}
                >
                  {busy ? "Verifying…" : "Verify & create account"}{" "}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="auth-text-button"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError("");
                  }}
                >
                  Use a different number
                </button>
              </form>
            )}

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            {/* ── Demo accounts (only when demo mode is on) ── */}
            {step === "phone" && demoMode && (
              <div className="demo-login-block">
                <div className="auth-divider">
                  <span>OR EXPLORE WITH A DEMO ACCOUNT</span>
                </div>
                <button
                  id="signup-demo-customer-btn"
                  onClick={() => void demoSignIn("customer")}
                  disabled={busy}
                >
                  <span className="demo-button-icon">
                    <Home size={18} />
                  </span>
                  <span>
                    <strong>Join as a home seeker</strong>
                    <small>Save homes and express interest</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
                <button
                  id="signup-demo-owner-btn"
                  onClick={() => void demoSignIn("owner")}
                  disabled={busy}
                >
                  <span className="demo-button-icon owner">
                    <KeyRound size={18} />
                  </span>
                  <span>
                    <strong>Join as a property owner</strong>
                    <small>List properties and track interest</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              </div>
            )}

            <p className="auth-agreement">
              By signing up, you agree to our{" "}
              <Link href="/privacy">Privacy Policy</Link>. Your number is never
              shared with any other user.
            </p>
          </div>
        </div>

        {/* ── Right: visual panel ─────────────────────── */}
        <div className="auth-image-side">
          <img
            src="https://images.pexels.com/photos/6899447/pexels-photo-6899447.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Bright modern living room"
          />
          <div className="auth-image-shade" />
          <div className="auth-image-copy">
            <span>
              <Sparkles size={16} /> EVERYTHING STARTS HERE
            </span>
            <h2>
              Find a space.<br />
              Make it<br />
              <em>yours.</em>
            </h2>
            <p>
              Verified listings. Zero spam calls.<br />
              Your privacy, always protected.
            </p>
          </div>

          {/* Floating trust badges */}
          <div className="auth-image-pill">
            <ShieldCheck size={19} /> Private by design
          </div>

          <div className="signup-trust-badges">
            <span className="signup-badge">
              <BadgeCheck size={15} /> Verified listings
            </span>
            <span className="signup-badge">
              <LockKeyhole size={15} /> No spam calls
            </span>
            <span className="signup-badge">
              <Check size={15} /> Free to join
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
