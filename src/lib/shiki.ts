/**
 * shiki.ts — one Shiki theme for the whole site that only emits CSS variables.
 * The variables are mapped to design tokens in styles/base.css (--shiki-* → --syn-*),
 * so code follows the theme switch like everything else.
 */
import { createCssVariablesTheme } from "shiki";

export const cssVariablesTheme = createCssVariablesTheme({
  name: "css-variables",
  variablePrefix: "--shiki-",
  variableDefaults: {},
  fontStyle: true,
});
