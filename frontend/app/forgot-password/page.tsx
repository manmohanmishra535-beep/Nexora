"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import AuthShell from "@/components/AuthShell";
import Button from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type Step = "email" | "code" | "password";

const COPY: Record<Step, { title: string; subtitle: string }> = {
  email: {
    title: "Forgot your password?",
    subtitle:
      "Enter the email on your account and we'll send a six-digit reset code.",
  },
  code: {
    title: "Check your email",
    subtitle: "Enter the reset code we sent to finish verifying it's you.",
  },
  password: {
    title: "Choose a new password",
    subtitle: "Pick something strong. You'll be signed in right after saving.",
  },
};

export default function ForgotPasswordPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isFetching = fetchStatus === "fetching";

  const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: createError } = await signIn.create({
        identifier: email.trim(),
      });

      if (createError) {
        setError(createError.message || "Unable to find account.");
        return;
      }

      const { error: sendError } =
        await signIn.resetPasswordEmailCode.sendCode();

      if (sendError) {
        setError(sendError.message || "Unable to send reset code.");
        return;
      }

      setStep("code");
      setSuccess("Password reset code sent to your email.");
    } catch (err) {
      console.error("Send reset code error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error: verifyError } =
        await signIn.resetPasswordEmailCode.verifyCode({
          code: code.trim(),
        });

      if (verifyError) {
        setError(verifyError.message || "Invalid verification code.");
        return;
      }

      setStep("password");
      setSuccess("Email verified. You can now set a new password.");
    } catch (err) {
      console.error("Code verification error:", err);
      setError(
        err instanceof Error ? err.message : "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: passwordError } =
        await signIn.resetPasswordEmailCode.submitPassword({
          password,
          signOutOfOtherSessions: true,
        });

      if (passwordError) {
        setError(passwordError.message || "Unable to update password.");
        return;
      }

      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize({
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              console.log("Pending session task:", session.currentTask);
              setError("Additional account verification is required.");
              return;
            }

            const url = decorateUrl("/");

            if (url.startsWith("http")) {
              window.location.assign(url);
            } else {
              router.replace(url);
            }
          },
        });

        if (finalizeError) {
          setError(
            finalizeError.message || "Password updated, but sign-in failed."
          );
        }
      } else if (signIn.status === "needs_second_factor") {
        setError("Additional authentication is required.");
      } else {
        setError("Password updated, but the sign-in is not complete.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err instanceof Error ? err.message : "Password reset failed."
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
        await signIn.resetPasswordEmailCode.sendCode();

      if (resendError) {
        setError(resendError.message || "Unable to resend code.");
        return;
      }

      setSuccess("A new reset code has been sent.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to resend code."
      );
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[step];

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-accent hover:underline"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      {step === "email" && (
        <form onSubmit={handleSendCode} className="grid gap-4">
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

          <Button
            type="submit"
            block
            className="h-11"
            disabled={loading || isFetching}
          >
            {loading ? "Sending code…" : "Send reset code"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="grid gap-4">
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
            placeholder="Enter reset code"
          />

          <Button
            type="submit"
            block
            className="h-11"
            disabled={loading || isFetching}
          >
            {loading ? "Verifying…" : "Verify code"}
          </Button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading || isFetching}
            className="text-center text-[13px] font-semibold text-accent hover:underline disabled:opacity-50"
          >
            Resend verification code
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handleResetPassword} className="grid gap-4">
          <Field
            id="password"
            label="New password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter new password"
          />

          <Field
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
          />

          <Button
            type="submit"
            block
            className="h-11"
            disabled={loading || isFetching}
          >
            {loading ? "Updating password…" : "Reset password"}
          </Button>
        </form>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-1 border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-5 text-danger"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-4 rounded-1 border border-accent/30 bg-accent-soft px-3 py-2.5 text-[13px] leading-5 text-accent"
        >
          {success}
        </p>
      )}
    </AuthShell>
  );
}
