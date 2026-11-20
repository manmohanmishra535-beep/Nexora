import { redirect } from "next/navigation";

/**
 * Profile editing now lives inside Settings, next to theme and account.
 */
export default function EditProfileRedirectPage() {
  redirect("/settings");
}
