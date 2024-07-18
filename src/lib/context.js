import { readFileSync, statSync } from "node:fs";
import { InvalidConfigurationFileError } from "./errors.js";
import { homedir } from "node:os";
import { programName } from "./config.js";
import path from "node:path";

const contextDirectory = ".applura";
const deployKeyIDFileName = "deploy-key-id";

/**
 * @param {string} cwd
 * @param {string[]} argv
 * @param {object} env
 * @return {[Context, string[]]}
 */
export function getContext(cwd, argv, env) {
  const deployKeyIDFilePath = `${cwd}/${contextDirectory}/${deployKeyIDFileName}`;
  const init = {
    configuration: `${env["XDG_CONFIG_HOME"] || `${homedir()}/.config`}/${programName}`,
    deployKey: env["APPLURA_DEPLOY_KEY"],
    execArgv: argv.slice(0, 2),
    deployKeyIDFilePath,
  };
  try {
    init.deployKeyID = readFileSync(deployKeyIDFilePath).toString();
  } catch (e) {
    if (!new Set(["ENOTDIR", "ENOENT"]).has(e.code)) {
      throw e;
    }
  }
  const configFlagIndex = argv.some((arg) => arg === "--config-dir")
    ? argv.lastIndexOf("--config-dir")
    : argv.lastIndexOf("-c");
  const hasConfigOverride = configFlagIndex > -1;
  if (hasConfigOverride) {
    init.configuration = argv[configFlagIndex + 1];
  }
  const unhandledArgs = hasConfigOverride
    ? argv.toSpliced(configFlagIndex, 2)
    : argv;
  return [new Context(init), unhandledArgs];
}

export class Context {
  /**
   * @type string
   */
  #configurationDirectory;
  /**
   * @type string
   */
  #deployKey;
  /**
   * @type string
   */
  #deployKeyID;
  /**
   * @type string
   */
  #deployKeyIDFilePath;

  /**
   * @param {Object} init
   * @param {string} [init.deployKey]
   * @param {string} [init.deployKeyID]
   * @param {string} init.deployKeyIDFilePath
   * @param {string} init.configuration
   */
  constructor(init) {
    this.#deployKey = init.deployKey;
    this.#deployKeyID = init.deployKeyID;
    const { configuration } = init;
    let configDir = path.normalize(configuration);
    if (!path.isAbsolute(configDir)) {
      configDir = `${process.cwd()}/${configuration}`;
    }
    this.#configurationDirectory = configDir;
    this.#deployKeyIDFilePath = init.deployKeyIDFilePath;
  }

  get deployKey() {
    return this.#deployKey;
  }

  get deployKeyID() {
    return this.#deployKeyID;
  }

  get deployKeyIDFilePath() {
    return this.#deployKeyIDFilePath;
  }

  get configurationDirectory() {
    return this.#configurationDirectory;
  }
}
