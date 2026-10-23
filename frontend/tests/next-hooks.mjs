// Lets node load the app's TypeScript the way Next resolves it: extension-less relative imports,
// the "@/" alias for src/, and Next's CommonJS entry points.
import { pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") return nextResolve("next/server.js", context);
  if (specifier.startsWith("@/")) specifier = pathToFileURL(path.join(SRC, specifier.slice(2))).href;
  if ((specifier.startsWith(".") || specifier.startsWith("file:")) && !/\.[a-z]+$/i.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      /* fall through */
    }
  }
  return nextResolve(specifier, context);
}
