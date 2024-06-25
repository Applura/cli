import { argv, argv0 } from "node:process";
import { readFileSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import {
  DeployKeyNotSetError,
  InvalidConfigurationFileError,
  InvalidPathError,
  InvalidSettingError,
  MissingConfigurationDirectoryError,
  MissingConfigurationFileError,
} from "./errors.js";
import { sep } from "node:path";
import { DeployKey } from "./deploy-key.js";
import { Settings } from "./settings.js";
import { Context } from "./context.js";

export const programName = "applura";

export const configFileName = "configuration.json";

export class Config {
  /**
   * @type string
   */
  #generated;
  /**
   * @type Settings
   */
  #settings;
  /**
   * @type Context
   */
  #context;

  /**
   * @param {object} settings
   * @param {object} metadata
   * @param {Context} context
   */
  constructor(settings, metadata, context) {
    const { generated } = metadata;
    this.#generated = generated;
    this.#settings = new Settings(settings);
    this.#context = context;
  }

  /**
   * @return {DeployKey}
   * @throws DeployKeyNotSetError
   */
  get deployKey() {
    return this.#context.deployKey || (this.#context.deployKeyID && this.#settings.deployKeys.find());
  }

  get deployKeys() {
    return this.#settings.deployKeys;
  }

  /**
   * @param {DeployKey} key
   */
  async addDeployKey(key) {
    this.#settings.addDeployKey(key);
  }

  static generate(context) {
    const generated = new Date().toISOString();
    return new Config({}, { generated }, context);
  }

  async write() {
    await writeFile(
      `${this.#context.configurationDirectory}${sep}${configFileName}`,
      JSON.stringify(this.normalized, null, "  "),
      {
        mode: 0o640,
      },
    );
  }

  /**
   * @param {Context} context
   * @returns {Config}
   */
  static read(context) {
    const configDir = context.configurationDirectory;
    const dirStats = statSync(`${configDir}`, { throwIfNoEntry: false });
    if (dirStats === undefined) {
      throw new MissingConfigurationDirectoryError(
        `missing configuration directory: ${configDir}`,
      );
    }
    if (!dirStats.isDirectory()) {
      throw new InvalidPathError(
        `configuration path is not a directory: ${configDir}`,
      );
    }
    const configFilePath = `${configDir}/${configFileName}`;
    const fileStats = statSync(`${configFilePath}`, { throwIfNoEntry: false });
    if (fileStats === undefined) {
      throw new MissingConfigurationFileError(
        `configuration directory does not contain a configuration.json file: ${configDir}`,
        configFilePath,
      );
    }
    if (!fileStats.isFile()) {
      throw new InvalidPathError(
        `configuration.json is not a file: ${configFilePath}`,
      );
    }
    let data;
    try {
      data = JSON.parse(readFileSync(configFilePath).toString());
    } catch (e) {
      throw new InvalidConfigurationFileError(
        `invalid configuration: unable to parse JSON: ${e.message}: ${configFilePath}`,
      );
    }
    if (typeof data !== "object" || data === null) {
      throw new InvalidConfigurationFileError(
        `invalid configuration: must contain a top-level object: ${configFilePath}`,
      );
    }
    const { settings, metadata } = data;
    try {
      return new Config(settings || {}, metadata || {}, context);
    } catch (e) {
      const message =
        e instanceof InvalidSettingError
          ? `invalid configuration: ${e.message}: ${configFilePath}: ${e.withPrefix("settings").pointer}`
          : `invalid configuration: ${e.message}: ${configFilePath}`;
      throw new InvalidConfigurationFileError(message);
    }
  }

  get normalized() {
    return {
      metadata: {
        generated: this.#generated,
      },
      settings: this.#settings.normalized,
    };
  }

  get serverURL() {
    return this.#settings.serverURL;
  }

  get deployKeyIDFilePath() {
    return this.#context.deployKeyIDFilePath;
  }

  get deployKeyDirectory() {
    return this.#context.configurationDirectory;
  }

  get programExecutionArgs() {
    return `${argv0} ${argv[1]}`;
  }
}
