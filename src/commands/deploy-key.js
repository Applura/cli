import { read } from "read";
import readline from "node:readline";
import { DeployKey } from "../lib/deploy-key.js";

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
  const projectLabel = project?.label || "Label not found";
  stderr.write(
    `${key.reference} ready to deploy to project: ${projectLabel}\n`,
  );
  stderr.write(
    `To deploy, run:\n\n\t${config.programExecutionArgs} deploy ./path/to/dist\n\n`,
  );
}

async function printWhile(stdStream, { pending, resolved, rejected }, unresolved) {
  let done = false;
  let succeeded = false;
  const results = await Promise.all([
    (async () => {
      const result = await unresolved;
      succeeded = true;
      done = true;
      return result;
    })(),
    (async () => {
      let i = 0;
      const frames = "\\|/-";
      while (!done) {
        const char = frames[i++ % frames.length];
        stdStream.write(`${char} ${pending}`);
        await delay(120);
        readline.clearLine(stdStream, -1);
        readline.cursorTo(stdStream, 0);
      }
    })(),
  ]);
  readline.clearLine(stdStream, -1);
  readline.cursorTo(stdStream, 0);
  stdStream.write(succeeded ? resolved : rejected);
  return results[0];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default deployKey;
