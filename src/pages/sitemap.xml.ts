/**
 * /sitemap.xml — every public page, generated at build time (no extra dependency).
 */
import type { APIRoute } from "astro";
import { getProjects } from "../lib/projects";
import { site } from "../config/site";

export const GET: APIRoute = async () => {
  const projects = await getProjects();
  const paths = ["/", "/projects/", "/about/", ...projects.map((p) => `/projects/${p.id}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site.url).href}</loc></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
