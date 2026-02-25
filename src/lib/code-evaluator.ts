/**
 * Client-side code evaluator using @babel/standalone.
 * Transforms user Remotion code into a live React component
 * that can be rendered by @remotion/player.
 */
import * as Babel from "@babel/standalone";
import React from "react";
import type { ParsedFile } from "./code-parser";

// Modules available to user code via `require()`
const AVAILABLE_MODULES: Record<string, unknown> = {
  react: React,
};

// Lazily populated on first eval
let remotionModule: typeof import("remotion") | null = null;

async function ensureModules() {
  if (!remotionModule) {
    remotionModule = await import("remotion");
  }
  AVAILABLE_MODULES["remotion"] = remotionModule;
}

/**
 * Minimal `require` shim for evaluated code.
 */
function makeRequire() {
  return (id: string) => {
    // Strip @remotion/* to just the package name
    const mod = AVAILABLE_MODULES[id];
    if (!mod) {
      throw new Error(
        `Module "${id}" is not available in the preview. Supported: ${Object.keys(AVAILABLE_MODULES).join(", ")}`
      );
    }
    return mod;
  };
}

/**
 * Transform a single file's source code with Babel.
 */
function transformCode(source: string, filename: string): string {
  const result = Babel.transform(source, {
    filename,
    presets: [
      [Babel.availablePresets["react"], { runtime: "classic" }],
      [Babel.availablePresets["typescript"], { isTSX: true, allExtensions: true }],
    ],
    plugins: [
      [Babel.availablePlugins["transform-modules-commonjs"]],
    ],
  });

  if (!result?.code) {
    throw new Error(`Babel transform returned empty output for ${filename}`);
  }

  return result.code;
}

/**
 * Evaluate transformed code in a sandboxed scope and return its exports.
 */
function evaluateModule(code: string, require: (id: string) => unknown): Record<string, unknown> {
  const moduleObj = { exports: {} as Record<string, unknown> };
  const exports = moduleObj.exports;

  // eslint-disable-next-line no-new-func
  const fn = new Function("require", "module", "exports", "React", code);
  fn(require, moduleObj, exports, React);

  return moduleObj.exports;
}

export interface EvalResult {
  component: React.ComponentType;
  error: null;
}

export interface EvalError {
  component: null;
  error: string;
}

/**
 * Evaluate parsed files and return the main component for the Remotion Player.
 *
 * Strategy:
 * 1. Transform all files with Babel
 * 2. Build a local module registry so files can require each other
 * 3. Find the "main" component (first file or the one with a default export)
 */
export async function evaluateCode(
  parsedFiles: ParsedFile[]
): Promise<EvalResult | EvalError> {
  if (parsedFiles.length === 0) {
    return { component: null, error: "No code to evaluate" };
  }

  try {
    await ensureModules();

    // Build module registry
    const moduleRegistry: Record<string, Record<string, unknown>> = {};
    const transformedFiles: { filename: string; code: string }[] = [];

    // Transform all files first
    for (const file of parsedFiles) {
      // Strip config comments before transform
      const cleaned = file.content.replace(
        /\/\*\s*__REMOTION_CONFIG__[\s\S]*?\*\//g,
        ""
      );
      const code = transformCode(cleaned, file.filename);
      transformedFiles.push({ filename: file.filename, code });
    }

    // Create a require function that can resolve local files
    const localRequire = (id: string) => {
      // Check local modules first (strip ./ and extensions)
      const normalized = id.replace(/^\.\//, "").replace(/\.(tsx?|jsx?)$/, "");
      for (const key of Object.keys(moduleRegistry)) {
        const keyNorm = key.replace(/\.(tsx?|jsx?)$/, "");
        if (keyNorm === normalized) {
          return moduleRegistry[key];
        }
      }
      // Fall back to global modules
      return makeRequire()(id);
    };

    // Evaluate files in order (dependencies should come before dependents)
    // Simple approach: evaluate all, retry failed ones once
    const pending = [...transformedFiles];
    let lastError: string | null = null;
    let maxPasses = 3;

    while (pending.length > 0 && maxPasses > 0) {
      const failed: typeof pending = [];
      for (const file of pending) {
        try {
          const exports = evaluateModule(file.code, localRequire);
          moduleRegistry[file.filename] = exports;
        } catch (err: any) {
          lastError = err.message;
          failed.push(file);
        }
      }
      if (failed.length === pending.length) {
        // No progress, stop
        break;
      }
      pending.length = 0;
      pending.push(...failed);
      maxPasses--;
    }

    if (pending.length > 0 && Object.keys(moduleRegistry).length === 0) {
      return { component: null, error: lastError || "Failed to evaluate code" };
    }

    // Find the main component
    // Priority: first file's default export, or any file's default export
    let mainComponent: React.ComponentType | null = null;

    // Check first file
    const firstFileExports = moduleRegistry[parsedFiles[0].filename];
    if (firstFileExports) {
      const defaultExport = (firstFileExports as any).default || (firstFileExports as any).__esModule && (firstFileExports as any).default;
      if (typeof defaultExport === "function") {
        mainComponent = defaultExport as React.ComponentType;
      }
    }

    // If first file has no default export, check others
    if (!mainComponent) {
      for (const file of parsedFiles) {
        const exports = moduleRegistry[file.filename];
        if (exports) {
          const def = (exports as any).default;
          if (typeof def === "function") {
            mainComponent = def as React.ComponentType;
            break;
          }
          // Check named exports — pick the first function
          for (const val of Object.values(exports)) {
            if (typeof val === "function" && val.name && val.name[0] === val.name[0].toUpperCase()) {
              mainComponent = val as React.ComponentType;
              break;
            }
          }
          if (mainComponent) break;
        }
      }
    }

    if (!mainComponent) {
      return { component: null, error: "No React component found. Make sure your code has a default export." };
    }

    return { component: mainComponent, error: null };
  } catch (err: any) {
    return { component: null, error: err.message || "Unknown evaluation error" };
  }
}
