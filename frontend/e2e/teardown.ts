import { deleteTestUserPosts } from "./helpers";

/** Removes everything the throwaway account posted during the run. */
export default async function globalTeardown(): Promise<void> {
  await deleteTestUserPosts();
}
