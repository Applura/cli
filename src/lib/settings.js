import { InvalidSettingError } from "./errors.js";
import { DeployKey } from "./deploy-key.js";

export class Settings {
  /**
   * @property {string} #server.hostname
   */
  #server;

  static #defaults = {
    server: {
      hostname: "api.ops.applura.app",
    },
    deployKeys: [],
  };

  /**
   * @type DeployKey[]
   */
  #deployKeys;

  static #recognizedProps = new Set(["server", "deployKeys"]);

  constructor(init) {
    const props = { ...Settings.#defaults, ...init };
    for (const prop in props) {
      if (!Settings.#recognizedProps.has(prop)) {
        throw new InvalidSettingError("unrecognized property", `/${prop}`);
      }
    }
    if (typeof props.server.hostname !== "string") {
      throw new InvalidSettingError(
        "hostname must be a string",
        "/server/hostname",
      );
    }
    this.#server = props.server;
    if (!Array.isArray(props.deployKeys)) {
      throw new InvalidSettingError(
        "deployKeys must be an array",
        "/deployKeys",
      );
    }
    this.#deployKeys = props.deployKeys.map((k, i) => {
      try {
        const key = new DeployKey(k);
        key.validate();
        return key;
      } catch (e) {
        if (e instanceof InvalidSettingError) {
          throw e.withPrefix(`deployKeys/${i}`);
        }
        throw e;
      }
    });
  }

  /**
   * @return {string}
   */
  get serverURL() {
    return `https://${this.#server.hostname}`;
  }

  get deployKeys() {
    return this.#deployKeys || [];
  }

  get normalized() {
    const normalized = {
      deployKeys: this.#deployKeys.map((k) => k.normalized),
    };
    if (this.#server.hostname !== Settings.#defaults.server.hostname) {
      normalized.server = {
        hostname: this.#server.hostname,
      };
    }
    return normalized;
  }

  /**
   * @param {DeployKey} key
   */
  addDeployKey(key) {
    this.#deployKeys = this.#deployKeys
      .concat(key)
      .reduce((acc, curr) => {
        return !acc.some((cmp) => curr.id === cmp.id) ? [...acc, curr] : acc;
      }, [])
      .sort((a, b) => a.reference.localeCompare(b.reference));
  }
}
