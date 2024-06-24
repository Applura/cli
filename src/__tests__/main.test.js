import { describe, expect, test } from "@jest/globals";
import main from "../main.js";
import { mkdtempSync, statSync } from "node:fs";
import { sep } from "node:path";
import { tmpdir } from "node:os";
import { stdStreams } from "../lib/testing/std-streams.js";
import { Config } from "../lib/config.js";
import { getContext } from "../lib/context.js";

describe("main", () => {
  const testDir = mkdtempSync(`${tmpdir()}${sep}`);
  describe("init should create missing configuration", () => {
    const inputs = ["y", "Y", "yes", "YES", "Yes", "yeS"];
    for (const answer of inputs) {
      test(`with ${answer}`, async () => {
        let lastPrompt, lastMessage;
        const testConfigDir = mkdtempSync(`${testDir}${sep}`);
        const configDir = `${testConfigDir}/.config/applura`;
        const streams = stdStreams();
        const programRun = main(
          testConfigDir,
          ["node", "applura", "-c", configDir, "init"],
          streams,
          {},
        );
        lastPrompt = await streams.output();
        expect(lastPrompt).toEqual(
          `${configDir} does not exist. Would you like to create it? [Y/n] `,
        );
        streams.stdin.write(`${answer}\n`);
        await expect(programRun).resolves.not.toThrow();
        lastMessage = await streams.errors();
        expect(lastMessage).toEqual(
          `${configDir}/configuration.json created.\n`,
        );
        const fileStat = statSync(`${configDir}/configuration.json`, {
          throwIfNoEntry: false,
        });
        expect(fileStat).not.toBeUndefined();
        expect(await streams.output()).toEqual("");
        expect(await streams.errors()).toEqual("");
      });
    }
  });

  // describe("deploy-key", () => {
  //   describe("setup", () => {
  //     test(`should prompt for and save a deploy key token`, async () => {
  //       let lastPrompt, lastMessage;
  //       const configDir = mkdtempSync(`${testDir}${sep}`);
  //       setUpDefaultConfig(configDir);
  //       const streams = stdStreams();
  //       const programRun = main(
  //         configDir,
  //         ["node", "applura", "-c", configDir, "deploy-key", "setup"],
  //         streams,
  //         {},
  //       );
  //       const testToken = "deploy_key_foobarbaz";
  //       lastPrompt = await streams.output();
  //       expect(lastPrompt).toEqual(`Enter your deploy key: `);
  //       streams.stdin.write(`${testToken}\n`);
  //       lastMessage = await streams.errors();
  //       expect(lastMessage).toEqual(`Your token is: ${testToken}\n`);
  //       // await expect(programRun).resolves.not.toThrow();
  //       // lastMessage = await streams.errors();
  //       // expect(lastMessage).toEqual(
  //       //   `${configDir}/configuration.json created.\n`,
  //       // );
  //       // const fileStat = statSync(`${configDir}/configuration.json`, {
  //       //   throwIfNoEntry: false,
  //       // });
  //       // expect(fileStat).not.toBeUndefined();
  //       // expect(await streams.output()).toEqual("");
  //       // expect(await streams.errors()).toEqual("");
  //     });
  //   });
  // });
});

function setUpDefaultConfig(dir) {
  Config.save(dir, Config.generate(getContext(dir, {})));
}
