/**
 * projects.ts — the one place that reads the projects collection.
 * Newest first (by period.start); drafts are hidden.
 */
import { getCollection } from "astro:content";

export async function getProjects() {
  const all = await getCollection("projects", ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.period.start.localeCompare(a.data.period.start));
}
