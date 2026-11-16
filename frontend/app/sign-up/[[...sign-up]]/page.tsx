"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import AuthShell from "@/components/AuthShell";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export default function SignUpPage() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isFetching = fetchStatus === "fetching";

  // Create the account and send the email verification code.
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: signUpError } = await signUp.password({
        emailAddress: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message || "Unable to create your account.");
        return;
      }

      const { error: verificationError } =
        await signUp.verifications.sendEmailCode();

      if (verificationError) {
        setError(
          verificationError.message ||
            "Account created, but we could not send the verification code. Try again."
        );
        return;
      }

      setStep("verify");
      setSuccess("Verification code sent to your email address.");
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify the email address, then activate the new session.
  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid verification code.");
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log("Pending session task:", session.currentTask);
              setError(
                "Your account needs an additional verification step."
              );
              return;
            }

            const url = decorateUrl("/");

            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } else {
        setError(
          "Email verified, but signup is not complete. Please check your account requirements."
        );
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(
        err instanceof Error ? err.message : "Email verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: resendError } =
        await signUp.verifications.sendEmailCode();

      if (resendError) {
        setError(resendError.message || "Unable to resend the code.");
        return;
      }

      setSuccess("A new verification code has been sent.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to resend code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        title={step === "signup" ? "Create your account" : "Verify your email"}
        subtitle={
          step === "signup"
            ? "Join Nexora to follow people, post updates and message privately."
            : "We sent a verification code to the address below."
        }
        footer={
          step === "signup" ? (
            <>
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-accent hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <span>
              By continuing, you agree to Nexora&apos;s Terms of Service and
              Privacy Policy.
            </span>
          )
        }
      >
        {step === "signup" ? (
          <form onSubmit={handleSignUp} className="grid gap-4">
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

            <Field
              id="password"
              label="Password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              hint="Use at least 8 characters and avoid passwords you use elsewhere."
            />

            {error && (
              <p
                role="alert"
                className="rounded-1 border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-5 text-danger"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="rounded-1 border border-accent/30 bg-accent-soft px-3 py-2.5 text-[13px] leading-5 text-accent"
              >
                {success}
              </p>
            )}

            <Button
              type="submit"
              block
              className="h-11"
              disabled={loading || isFetching}
            >
              {loading || isFetching ? "Creating account…" : "Create account"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="grid gap-4">
            <p className="rounded-1 bg-surface-2 px-3 py-2.5 text-center text-[13px] text-ink-2">
              Code sent to <b className="text-ink">{email}</b>
            </p>

            <Field
              id="code"
              label="Verification code"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter your email code"
            />

            {error && (
              <p
                role="alert"
                className="rounded-1 border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-5 text-danger"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="rounded-1 border border-accent/30 bg-accent-soft px-3 py-2.5 text-[13px] leading-5 text-accent"
              >
                {success}
              </p>
            )}

            <Button
              type="submit"
              block
              className="h-11"
              disabled={loading || isFetching}
            >
              {loading || isFetching ? "Verifying…" : "Verify email"}
            </Button>

            <div className="flex flex-col items-center gap-2 text-[13px]">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || isFetching}
                className="font-semibold text-accent hover:underline disabled:opacity-50"
              >
                Resend verification code
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("signup");
                  setCode("");
                  setError("");
                  setSuccess("");
                }}
                className="text-ink-3 hover:text-ink"
              >
                Back to sign up
              </button>
            </div>
          </form>
        )}
      </AuthShell>

      {/* Required for Clerk CAPTCHA when applicable */}
      <div id="clerk-captcha" />
    </>
  );
}
