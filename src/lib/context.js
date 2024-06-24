import { readFileSync, statSync } from "node:fs";
import {
  InvalidConfigurationFileError,
  InvalidPathError,
  MissingConfigurationDirectoryError,
} from "./errors.js";
import { homedir } from "node:os";
import { programName } from "./config.js";
import path from "node:path";

const contextDirectory = ".applura";
const contextFileName = "application.json";

/**
 * @param {string} cwd
 * @param {string[]} argv
 * @param {object} env
 * @return {[Context, string[]]}
 */
export function getContext(cwd, argv, env) {
  const contextFilePath = `${cwd}/${contextDirectory}/${contextFileName}`;
  const contextStats = statSync(contextFilePath, { throwIfNoEntry: false });
  const overrides = {
    configuration: `${env["XDG_CONFIG_HOME"] || `${homedir()}/.config`}/${programName}`,
    project: env["APPLURA_PROJECT_ID"],
    application: env["APPLURA_APPLICATION_ID"],
    deployKey: env["APPLURA_DEPLOY_KEY"],
    execArgv: argv.slice(0, 2),
  };
  const configFlagIndex = argv.some((arg) => arg === "--config-dir")
    ? argv.lastIndexOf("--config-dir")
    : argv.lastIndexOf("-c");
  const hasConfigOverride = configFlagIndex > -1;
  if (hasConfigOverride) {
    overrides.configuration = argv[configFlagIndex + 1];
  }
  const unhandledArgs = hasConfigOverride
    ? argv.toSpliced(configFlagIndex, 2)
    : argv;
  if (contextStats === undefined) {
    return [new Context(overrides), unhandledArgs];
  }
  let data;
  try {
    data = JSON.parse(readFileSync(contextFilePath).toString());
  } catch (e) {
    throw new InvalidConfigurationFileError(
      `invalid context: unable to parse JSON: ${e.message}: ${contextFilePath}`,
    );
  }
  if (typeof data !== "object" || data === null) {
    throw new InvalidConfigurationFileError(
      `invalid context: must contain a top-level object: ${contextFilePath}`,
    );
  }
  const recognizedProps = new Set(["project", "application", "deployKey"]);
  for (const prop in data) {
    if (!recognizedProps.has(prop)) {
      throw new InvalidConfigurationFileError(
        `invalid context: unrecognized prop: ${contextFilePath}: /${prop}`,
      );
    }
  }
  return [new Context({ ...data, ...overrides }), unhandledArgs];
}

export class Context {
  /**
   * @type string
   */
  #configurationDirectory;
  /**
   * @type string
   */
  #project;
  /**
   * @type string
   */
  #application;
  /**
   * @type string
   */
  #deployKey;
  /**
   * @type string
   */
  #deployKeyID;

  /**
   * @param {Object} init
   * @param {string} [init.project]
   * @param {string} [init.application]
   * @param {string} [init.deployKey]
   * @param {string} init.configuration
   */
  constructor(init) {
    this.#project = init.project;
    this.#application = init.application;
    this.#deployKey = init.deployKey;
    const { configuration } = init;
    let configDir = path.normalize(configuration);
    if (!path.isAbsolute(configDir)) {
      configDir = `${process.cwd()}/${configuration}`;
    }
    this.#configurationDirectory = configDir;
  }

  get project() {
    return this.#project;
  }

  get application() {
    return this.#application;
  }

  get deployKey() {
    return this.#deployKey;
  }

  get deployKeyID() {
    return this.#deployKeyID;
  }

  get configurationDirectory() {
    return this.#configurationDirectory;
  }
}
