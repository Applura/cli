import { read } from "read";
import { DeployKey } from "../lib/deploy-key.js";
import { confirm, printWhile } from "../lib/cli.js";
import { DeployKeyAlreadyExistsError } from "../lib/errors.js";

/**
 *
 * @param args
 * @param stdin
 * @param stdout
 * @param stderr
 * @param {Config} config
 * @return {Promise<void>}
 */
async function deployKey(args, { stdin, stdout, stderr }, config) {
  const { key, project } = await setupDeployKey(
    args,
    { stdin, stdout, stderr },
    config,
  );
  const projectLabel = project?.label || "Label not found";
  stderr.write(
    `${key.reference} ready to deploy to project: ${projectLabel}\n`,
  );
  stderr.write(
    `To deploy, run:\n\n\t${config.programExecutionArgs} deploy ./path/to/dist\n\n`,
  );
}

export async function setupDeployKey(args, { stdin, stdout, stderr }, config) {
  const token = await read({
    silent: true,
    prompt: "Enter your deploy key:\n",
    input: stdin,
    output: stdout,
  });
  stderr.write("\n");
  const key = DeployKey.fromToken(token);
  const project = await printWhile(
    stderr,
    {
      pending: "Verifying key…",
      resolved: "Key verified.\n",
      rejected: "Key could not be verified.\n",
    },
    DeployKey.getProject(key, { config }),
  );
  key.project = project.id;
  await key.write(config.deployKeyDirectory);
  await config.addDeployKey(key);
  await config.write();
  return { key, project };
}

export default deployKey;
