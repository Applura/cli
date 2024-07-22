import {
  DeployKeyAlreadyExistsError,
  InvalidPathError,
  InvalidSettingError,
  InvariantError,
  MissingDeployKeyDirectoryError,
  UnknownError,
  UserError,
} from "./errors.js";
import { readFileSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import parse from "./resource.js";
import { writeFile } from "node:fs/promises";
import { sep } from "node:path";

export class DeployKey {
  /**
   * @type string
   */
  #id;
  /**
   * @type string
   */
  #reference;
  /**
   * @type string
   */
  #path;
  /**
   * @type string
   */
  #project;

  /**
   * The secret deploy key token value.
   *
   * Only set when created from a token or after reading from disk.
   *
   * @type string
   */
  #read;

  /**
   * @param {string} init.id
   * @param {string} init.reference
   * @param {string} init.path
   * @param {string} init.project
   */
  constructor(init) {
    for (const prop of ["id", "reference"]) {
      if (!(prop in init)) {
        throw new InvalidSettingError(
          `deploy key missing required property`,
          `/${prop}`,
        );
      }
      const value = init[prop];
      if (typeof value !== "string") {
        throw new InvalidSettingError(
          `deploy key ${prop} must be a string`,
          `/${prop}`,
        );
      }
    }
    this.#id = init.id;
    this.#reference = init.reference;
    this.#path = init.path;
    this.#project = init.project;
  }

  get id() {
    return this.#id;
  }

  get reference() {
    return this.#reference;
  }

  get project() {
    return this.#project;
  }

  set project(value) {
    this.#project = value;
  }

  validate() {
    const keyStats = statSync(this.#path, { throwIfNoEntry: false });
    if (keyStats === undefined) {
      throw new InvalidSettingError(
        `deploy key path does not exist or is not readable: ${this.#path}`,
        "/path",
      );
    }
    if (!keyStats.isFile()) {
      throw new InvalidSettingError(
        `deploy key path must be a file but it is not: ${this.#path}`,
        "/path",
      );
    }
  }

  read() {
    if (this.#read === undefined) {
      this.#read = readFileSync(this.#path).toString();
    }
    return this.#read;
  }

  async write(directory) {
    if (this.#read === undefined) {
      throw new InvariantError(
        "cannot write a key that does not have a complete secret token string",
      );
    }
    this.#path = `${directory}${sep}${this.reference.replace("…", "___")}.enc`;
    const dirStats = statSync(directory, { throwIfNoEntry: false });
    if (dirStats === undefined) {
      throw new MissingDeployKeyDirectoryError(
        `missing deploy key directory: ${directory}`,
        directory,
      );
    }
    if (!dirStats.isDirectory()) {
      throw new InvalidPathError(
        `deploy key directory path is not a directory: ${directory}`,
      );
    }
    const keyStats = statSync(this.#path, { throwIfNoEntry: false });
    if (keyStats !== undefined) {
      if ((await readFile(this.#path)).toString() === this.#read) {
        return;
      }
      throw new DeployKeyAlreadyExistsError(
        `a deploy key at the path ${this.#path} already exists but it does not match the entered key`,
      );
    }
    await writeFile(this.#path, this.#read, {
      mode: 0o600,
    });
  }

  /**
   * @param {string} value
   * @param {Config} config
   * @returns {DeployKey}
   */
  static fromToken(value) {
    if (!value.startsWith("deploy_key_")) {
      throw new UserError("not a deploy key");
    }
    if (!/^deploy_key_[0-9a-f]{64}$/.test(value)) {
      throw new UserError("not a valid deploy key");
    }
    const bin = Buffer.from(value.substring("deploy_key_".length), "hex");
    if (bin.length !== 32) {
      throw new UserError("not a valid deploy key: decode error");
    }
    const id = Buffer.concat([bin.subarray(2 + 16), bin.subarray(0, 2)]);
    const refStart = id.subarray(16 - 2).toString("hex");
    const refEnd = id.subarray(16 - 4, 16 - 2).toString("hex");
    const reference = `deploy_key_${refStart}…${refEnd}`;
    const uuid = [
      id.subarray(0, 4),
      id.subarray(4, 6),
      id.subarray(6, 8),
      id.subarray(8, 10),
      id.subarray(10),
    ]
      .map((b) => b.toString("hex"))
      .join("-");
    const key = new DeployKey({
      id: uuid,
      reference,
    });
    key.#read = value;
    return key;
  }

  get normalized() {
    return {
      id: this.#id,
      reference: this.#reference,
      path: this.#path,
      project: this.#project,
    };
  }

  /**
   *
   * @param key
   * @param {object} options
   * @param {Config} options.config
   */
  static async getProject(key, { config }) {
    if (typeof key === "object") {
      key = key.read()
    }
    const response = await fetch(config.serverURL, {
      headers: {
        authorization: `Bearer ${key}`,
      },
    });
    if (response.status !== 200) {
      throw new UnknownError(`unexpected status code: ${response.status}`);
    }
    const mediaType =
      response.headers.get("content-type") || "no content-type header";
    if (!mediaType.startsWith("application/vnd.api+json")) {
      throw new UnknownError(`unexpected media type: ${mediaType}`);
    }
    const document = parse(await response.json());
    if (document.type !== "kernels:overview") {
      throw new UnknownError(
        `unexpected resource type: ${document.data?.type}`,
      );
    }
    if (document.kernels.length !== 1) {
      throw new UnknownError(
        `expected a single project: got: ${document.kernels.length}`,
      );
    }
    return document.kernels[0];
  }
}
