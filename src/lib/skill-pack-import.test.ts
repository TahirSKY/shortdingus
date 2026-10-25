import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import {
  buildPackStyleNote, mergePackStyleGuide, parseZipBytes, slugForPackFile,
} from "./skill-pack-import";

describe("skill pack import helpers", () => {
  it("unpacks a ZIP into readable skills and preserves the pack's relative file paths", () => {
    const zip = zipSync({
      "NextPhase-Persa-Shorts/SKILL.md": strToU8("Follow the editing rules."),
      "NextPhase-Persa-Shorts/tokens.css": strToU8(":root { --ink: #101010; }"),
      "NextPhase-Persa-Shorts/image-1.png": new Uint8Array([137, 80, 78, 71]),
    });

    const parsed = parseZipBytes(zip, "NextPhase-Persa-Shorts.zip");

    expect(parsed.name).toBe("NextPhase Persa Shorts");
    expect(parsed.entries.map((entry) => entry.path)).toEqual(["SKILL.md", "tokens.css", "image-1.png"]);
    expect(parsed.entries.map((entry) => entry.kind)).toEqual(["text", "text", "binary"]);
    expect(parsed.entries[0].text).toBe("Follow the editing rules.");
    expect(parsed.entries[2].mimeType).toBe("image/png");
  });

  it("keeps extensionless and shell-script tools as readable source rather than dropping them", () => {
    const zip = zipSync({
      "pack/py": strToU8("#!/usr/bin/env python\\nprint('ok')"),
      "pack/finish.sh": strToU8("#!/bin/sh\\necho done"),
    });
    const parsed = parseZipBytes(zip, "pack.zip");
    expect(parsed.entries.map((entry) => entry.kind)).toEqual(["text", "text"]);
    expect(parsed.entries.map((entry) => entry.path)).toEqual(["py", "finish.sh"]);
  });

  it("rejects unsafe traversal paths before extracting files", () => {
    const zip = zipSync({ "pack/../outside.txt": strToU8("not allowed") });
    expect(() => parseZipBytes(zip, "pack.zip")).toThrow(/Unsafe parent-directory path/);
  });

  it("skips local secrets and reports them, without dropping the readable rules", () => {
    const zip = zipSync({
      "pack/SKILL.md": strToU8("Rules"),
      "pack/.env": strToU8("SECRET=value"),
      "pack/.git/config": strToU8("generated data"),
    });
    const parsed = parseZipBytes(zip, "pack.zip");
    expect(parsed.entries.map((entry) => entry.path)).toEqual(["SKILL.md"]);
    expect(parsed.skipped).toHaveLength(2);
  });

  it("does not turn a root-level generated folder into importable files while stripping a ZIP root", () => {
    const zip = zipSync({ ".git/config": strToU8("generated data") });
    expect(() => parseZipBytes(zip, "git-folder.zip")).toThrow(/No usable files were found/);
  });

  it("uses stable, bounded skill slugs for imported reference files", () => {
    const first = slugForPackFile("nextphase-persa-shorts", "reference folders/a very long style rules file.md");
    expect(first).toBe(slugForPackFile("nextphase-persa-shorts", "reference folders/a very long style rules file.md"));
    expect(first).toMatch(/^[a-z0-9-]+$/);
    expect(first.length).toBeLessThanOrEqual(60);
  });

  it("replaces a pack's style-guide index without deleting the user's existing guide", () => {
    const initial = "Keep captions readable.\n\n--- BEGIN IMPORTED PACK nextphase ---\nold index\n--- END IMPORTED PACK nextphase ---";
    const note = buildPackStyleNote("NextPhase", "pack-nextphase-skill", ["pack-nextphase-skill", "pack-nextphase-style"]);
    const merged = mergePackStyleGuide(initial, "nextphase", note);
    expect(merged).toContain("Keep captions readable.");
    expect(merged).toContain("Primary editing rules: load the full skill `pack-nextphase-skill`");
    expect(merged.match(/BEGIN IMPORTED PACK nextphase/g)).toHaveLength(1);
  });
});
