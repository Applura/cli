import { describe, expect, test } from "@jest/globals";
import { homedir, tmpdir } from "node:os";
import { getContext } from "../context.js";
import fs from "fs";
import { sep } from "node:path";

describe("getContext", () => {
  const testDir = fs.mkdtempSync(`${tmpdir()}${sep}`);

  test("should parse empty command-line arguments", () => {
    const [context, args] = getContext(testDir, [], {});
    expect(context.configurationDirectory).toBe(`${homedir()}/.config/applura`);
    expect(args).toHaveLength(0);
  });

  test("should handle command-line arguments without config dir arguments", () => {
    const [context, args] = getContext(testDir, ["test"], {});
    expect(context.configurationDirectory).toBe(`${homedir()}/.config/applura`);
    expect(args).toHaveLength(1);
  });

  test("should allow the config dir to be overridden by a --config-dir flag", () => {
    const [context, args] = getContext(
      testDir,
      ["--config-dir", "/etc/applura"],
      {},
    );
    expect(context.configurationDirectory).toBe(`/etc/applura`);
    expect(args).toHaveLength(0);
  });

  test("should allow the config dir to be overridden by a -c flag", () => {
    const [context, args] = getContext(testDir, ["-c", "/etc/applura"], {});
    expect(context.configurationDirectory).toBe(`/etc/applura`);
    expect(args).toHaveLength(0);
  });

  test("should handle a config dir override and an additional arg", () => {
    const [context, args] = getContext(
      testDir,
      ["-c", "/etc/applura", "test"],
      {},
    );
    expect(context.configurationDirectory).toBe(`/etc/applura`);
    expect(args).toHaveLength(1);
    expect(args[0]).toBe("test");
  });

  test("should handle a config dir override and an additional arg in a different order", () => {
    const [context, args] = getContext(
      testDir,
      ["test", "-c", "/etc/applura"],
      {},
    );
    expect(context.configurationDirectory).toBe(`/etc/applura`);
    expect(args).toHaveLength(1);
    expect(args[0]).toBe("test");
  });

  test("should handle a config dir override and additional arguments", () => {
    const [context, args] = getContext(
      testDir,
      ["test", "-c", "/etc/applura", "test"],
      {},
    );
    expect(context.configurationDirectory).toBe(`/etc/applura`);
    expect(args).toHaveLength(2);
    expect(args[0]).toBe("test");
    expect(args[1]).toBe("test");
  });

  test("should respect the XDG_CONFIG_HOME environment variable", () => {
    const [context, args] = getContext(testDir, [], {
      XDG_CONFIG_HOME: "/home/user/myDotFiles",
    });
    expect(context.configurationDirectory).toBe(
      `/home/user/myDotFiles/applura`,
    );
    expect(args).toHaveLength(0);
  });
});
