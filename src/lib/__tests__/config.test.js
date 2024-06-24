import { describe, expect, test } from "@jest/globals";
import { homedir, tmpdir } from "node:os";
import { Config } from "../config.js";
import {
  MissingConfigurationDirectoryError,
  InvalidPathError,
  MissingConfigurationFileError,
  InvalidConfigurationFileError,
} from "../errors.js";
import * as fs from "fs";
import { sep } from "node:path";
import { Context, getContext } from "../context.js";

describe("Config", () => {
  describe("read", () => {
    const testDir = fs.mkdtempSync(`${tmpdir()}${sep}`);
    const configDir = fs.mkdtempSync(`${testDir}${sep}`);
    const configPath = `${configDir}/configuration.json`;
    const badFilePath = `${configDir}/file`;
    const context = getContext(testDir, ["-c", configDir], {});

    fs.writeFileSync(badFilePath, "this file can be deleted");

    test("should check if the configuration directory exists", () => {
      const missingDir = `${configDir}/ghost`;
      const context = new Context({ configuration: missingDir });
      expect(() => Config.read(context)).toThrow(
        new MissingConfigurationDirectoryError(
          `missing configuration directory: ${configDir}/ghost`,
        ),
      );
    });

    test("should check if the configuration directory path is actually a directory", () => {
      const context = new Context({ configuration: badFilePath });
      expect(() => Config.read(context)).toThrow(
        new InvalidPathError(
          `configuration path is not a directory: ${badFilePath}`,
        ),
      );
    });

    test("should check if the configuration directory contains a configuration.json file", () => {
      const context = new Context({ configuration: configDir });
      expect(() => Config.read(context)).toThrow(
        new MissingConfigurationFileError(
          `configuration directory does not contain a configuration.json file: ${configDir}`,
          configDir,
        ),
      );
    });

    describe("should parse the configuration.json file if it exists", () => {
      const generated = new Date().toISOString();
      const badJSON = "{}}";
      const nullJSON = "null";
      const booleanJSON = "true";
      const goodJSON = `{"meta":{"generated":"${generated}"}}`;
      const badSettings = `{"meta":{"generated":"${generated}"},"settings":{"deployKeys":false}}`;
      const unrecognizedSettings = `{"meta":{"generated":"${generated}"},"settings":{"unrecognized":true}}`;
      const badDeployKey = `{"meta":{"generated":"${generated}"},"settings":{"deployKeys":[{}]}}`;
      const missingDeployKeyPath = {
        id: "15199984-ec8d-4e19-a661-93b7b8ced292",
        reference: "deploy_key_d292…b8ce",
        path: `${configDir}/deploy_key_d292___b8ce.enc`,
        project: "d024499c-bbf1-4aa4-b36f-013b34235540",
      };
      const missingDeployKey =
        `{"meta":{"generated":"${generated}"},"settings":{"deployKeys":[` +
        JSON.stringify(missingDeployKeyPath) +
        `]}}`;
      const directoryDeployKeyPath = {
        id: "15199984-ec8d-4e19-a661-93b7b8ced292",
        reference: "deploy_key_d292…b8ce",
        path: `${configDir}`,
        project: "d024499c-bbf1-4aa4-b36f-013b34235540",
      };
      const directoryDeployKey =
        `{"meta":{"generated":"${generated}"},"settings":{"deployKeys":[` +
        JSON.stringify(directoryDeployKeyPath) +
        `]}}`;

      test("and throw on invalid JSON", () => {
        fs.writeFileSync(configPath, badJSON);
        const context = new Context({ configuration: configDir });
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: unable to parse JSON: Unexpected non-whitespace character after JSON at position 2: ${configPath}`,
          ),
        );
      });

      test("and throw on valid JSON that does not contain an object", () => {
        fs.writeFileSync(configPath, nullJSON);
        const context = new Context({ configuration: configDir });
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: must contain a top-level object: ${configPath}`,
          ),
        );
        fs.writeFileSync(configPath, booleanJSON);
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: must contain a top-level object: ${configPath}`,
          ),
        );
      });

      test("and return a config object for valid JSON", () => {
        fs.writeFileSync(configPath, goodJSON);
        const context = new Context({ configuration: configDir });
        expect(Config.read(context)).toStrictEqual(
          new Config({}, { generated }),
        );
      });

      test("and throw an error for invalid settings", () => {
        fs.writeFileSync(configPath, badSettings);
        const context = new Context({ configuration: configDir });
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: deployKeys must be an array: ${configPath}: /settings/deployKeys`,
          ),
        );
      });

      test("and throw an error for an invalid deploy key setting", () => {
        fs.writeFileSync(configPath, badDeployKey);
        const context = new Context({ configuration: configDir });
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: deploy key missing required property: ${configPath}: /settings/deployKeys/0/id`,
          ),
        );
      });

      test("and throw an error for an invalid deploy key setting", () => {
        fs.writeFileSync(configPath, unrecognizedSettings);
        const context = new Context({ configuration: configDir });
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: unrecognized property: ${configPath}: /settings/unrecognized`,
          ),
        );
      });

      test("and throw an error for an unreadable deploy key path", () => {
        fs.writeFileSync(configPath, missingDeployKey);
        const context = new Context({ configuration: configDir });
        expect(() => Config.read(context)).toThrow(
          new InvalidConfigurationFileError(
            `invalid configuration: deploy key path does not exist or is not readable: ${missingDeployKeyPath.path}: ${configPath}: /settings/deployKeys/0/path`,
          ),
        );
      });
      //
      //   test("and throw an error for an non-file deploy key path", () => {
      //     fs.writeFileSync(configPath, directoryDeployKey);
      //     expect(() => Config.read(configDir, context)).toThrow(
      //       new InvalidConfigurationFileError(
      //         `invalid configuration: deploy key path must be a file but it is not: ${directoryDeployKeyPath.path}: ${configPath}: /settings/deployKeys/0/path`,
      //       ),
      //     );
      //   });
    });
  });
});
