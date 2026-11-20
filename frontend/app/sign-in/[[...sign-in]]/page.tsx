"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn, useUser } from "@clerk/nextjs";

import AuthShell from "@/components/AuthShell";
import LeaveAuthPage from "@/components/LeaveAuthPage";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { isLoaded: userLoaded, isSignedIn } = useUser()

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "verify">("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finishSignIn = async () => {
    if (!signIn || signIn.status !== "complete") {
      setError("Authentication is not complete. Please try again.");
      return;
    }

    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/");
        window.location.assign(url);
      },
    });
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!signIn) return;

    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password.");
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
        return;
      }

      if (
        signIn.status === "needs_client_trust" ||
        signIn.status === "needs_second_factor"
      ) {
        const emailFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code"
        );

        if (!emailFactor) {
          setError(
            "Email verification is not available for this account. Check your Clerk authentication settings."
          );
          return;
        }

        await signIn.mfa.sendEmailCode();

        setStep("verify");
        setError("");
        return;
      }

      setError(
        "Additional authentication is required. Please check your account settings."
      );
    } catch (err) {
      console.error("Nexora sign-in error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!signIn) return;

    setError("");
    setLoading(true);

    try {
      await signIn.mfa.verifyEmailCode({ code: code.trim() });

      if (signIn.status === "complete") {
        await finishSignIn();
      } else {
        setError("Verification is not complete. Please try again.");
      }
    } catch (err) {
      console.error("Nexora verification error:", err);

      setError(
        err instanceof Error ? err.message : "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!signIn) return;

    setError("");
    setLoading(true);

    try {
      await signIn.mfa.sendEmailCode();
      setError("A new verification code has been requested.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!userLoaded || isSignedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg text-[13px] text-ink-3">
        <LeaveAuthPage />
        Loading Nexora…
      </main>
    );
  }

  return (
    <AuthShell
      title={step === "password" ? "Welcome back" : "Verify your email"}
      subtitle={
        step === "password"
          ? "Sign in to catch up with your feed, replies and messages."
          : `Enter the verification code we sent to ${email}.`
      }
      footer={
        step === "password" ? (
          <>
            New to Nexora?{" "}
            <Link
              href="/sign-up"
              className="font-semibold text-accent hover:underline"
            >
              Create an account
            </Link>
          </>
        ) : (
          <span>Protected by Clerk. Nexora never sees your password.</span>
        )
      }
    >
      {step === "password" ? (
        <form onSubmit={handleSignIn} className="grid gap-4">
          <Field
            id="email"
            label="Email address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="password"
                className="text-[13px] font-semibold text-ink-2"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-[13px] font-semibold text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="h-11 w-full rounded-1 border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-hover placeholder:text-ink-3 focus:border-accent focus:outline-2 focus:outline-accent"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-1 border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-5 text-danger"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            block
            className="h-11"
            disabled={loading || fetchStatus === "fetching"}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="grid gap-4">
          <Field
            id="code"
            label="Verification code"
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter the email code"
          />

          {error && (
            <p
              role="alert"
              className="rounded-1 border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-5 text-danger"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            block
            className="h-11"
            disabled={loading || fetchStatus === "fetching"}
          >
            {loading ? "Verifying…" : "Verify and continue"}
          </Button>

          <div className="flex flex-col items-center gap-2 text-[13px]">
            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="font-semibold text-accent hover:underline disabled:opacity-50"
            >
              Resend verification code
            </button>

            <button
              type="button"
              onClick={() => {
                signIn?.reset();
                setStep("password");
                setCode("");
                setError("");
              }}
              className="text-ink-3 hover:text-ink"
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
