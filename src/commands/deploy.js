import { DeployKey } from "../lib/deploy-key.js";
import { confirm, printWhile, style } from "../lib/cli.js";
import { setupDeployKey } from "./deploy-key.js";
import { mkdir, readdir, writeFile, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { InvalidPathError, KnownError } from "../lib/errors.js";
import {read} from "read";
import {apiDeploy} from "../lib/api.js";

/**
 *
 * @param args
 * @param stdin
 * @param stdout
 * @param stderr
 * @param {Config} config
 */
export default async function deploy(args, { stdin, stdout, stderr }, config) {
  let key = config.deployKey;
  if (key === undefined) {
    const { key: keySelection, project } = await selectKey(
      args,
      { stdin, stdout, stderr },
      config,
    );
    const name = project.label ? `${style.italic}${project.label}` : project.id;
    const confirmed = await confirm({
      question: `Use ${style.bold}${keySelection.reference}${style.reset} to deploy to project ${style.bold}${name}${style.reset}?`,
      confirmOnEnter: true,
      input: stdin,
      output: stdout,
    });
    if (confirmed) {
      key = keySelection;
      if (
        await confirm({
          question: `Save this selection for the current directory?`,
          confirmOnEnter: true,
          input: stdin,
          output: stdout,
        })
      ) {
        await setupDeployKeyIDFile(key.id, {stdin, stdout, stderr}, config);
      }
    }
  }
  if (!key) {
    stderr.write(`This command requires a deploy key. Bye!\n`);
    return;
  }
  if (key) {
    const releaseNote = await read({
      silent: false,
      prompt: "Enter your release note:\n",
      input: stdin,
      output: stdout,
    });
    await apiDeploy(key, args[0], releaseNote, {stdin, stdout, stderr}, config);
  }
  stdout.write(`Selected!\n`);
}

async function setupDeployKeyIDFile(keyID, { stdin, stdout, stderr }, config) {
  const dir = dirname(config.deployKeyIDFilePath);
  await readdir(dir).catch((e) => {
    switch (e.code) {
      case 'ENOENT':
      case 'ENOTDIR':
        return mkdir(dir, { mode: 0o755 }).catch((e) => {
          switch (e.code) {
            case 'EEXIST':
              throw new InvalidPathError(`${dir} must be a directory but it is not.`);
            default:
          }
        });
      default:
        throw e;
    }
  })
  await writeFile(config.deployKeyIDFilePath, keyID).catch();
}

async function selectKey(args, { stdin, stdout, stderr }, config) {
  let keys = config.deployKeys;
  let key;
  if (keys.length === 0) {
    const confirmed = await confirm({
      question:
        "Cannot deploy without a deploy key. Would you like to set one up now?",
      confirmOnEnter: true,
      input: stdin,
      output: stdout,
    });
    if (!confirmed) {
      return null;
    }
    return setupDeployKey(args, { stdin, stdout, stderr }, config);
  }
  if (keys.length === 1) {
    key = keys[0];
  } else {
  }
  const project = await printWhile(
    stderr,
    {
      pending: "Checking deploy keys…",
      resolved: "Deploy key check complete.\n",
      rejected: "Deploy key check failed.\n",
    },
    DeployKey.getProject(key, { config }),
  );
  return { key, project };
}

