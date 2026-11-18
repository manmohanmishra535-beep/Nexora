"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/**
 * Confirmation step before Clerk signs the user out. Both the app shell and
 * the settings page route their logout actions through this dialog so the
 * sign-out flow is identical everywhere.
 */
export default function LogoutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const confirmLogout = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await signOut({ redirectUrl: "/sign-in" });
    } catch (error) {
      console.error("Nexora sign-out error:", error);
      setBusy(false);
      toast("Couldn't log out. Please try again.", "error");
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Log out of Nexora?"
      description="You'll need your email and password to sign back in."
      confirmLabel="Log out"
      cancelLabel="Stay signed in"
      busy={busy}
      busyLabel="Logging out…"
      onConfirm={confirmLogout}
      onCancel={busy ? () => undefined : onClose}
    />
  );
}
