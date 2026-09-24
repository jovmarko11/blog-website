/**
 * content.config.ts — registers the content collections.
 * The file name of each .mdx becomes its id and URL slug:
 *   src/content/projects/cli-interpreter-cpp.mdx → /projects/cli-interpreter-cpp/
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { projectSchema } from "./content/schema";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects" }),
  schema: projectSchema,
});

export const collections = { projects };
