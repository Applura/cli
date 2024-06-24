export class KnownError extends Error {}

export class InvariantError extends KnownError {}

export class UnknownError extends KnownError {}
export class UserError extends KnownError {}

export class NoCommandError extends UserError {}

export class InvalidPathError extends UserError {}

export class MissingConfigurationDirectoryError extends UserError {}

export class MissingConfigurationFileError extends UserError {
  path;

  constructor(message, path) {
    super();
    this.message = message;
    this.path = path;
  }
}

export class InvalidConfigurationFileError extends UserError {}

export class MissingDeployKeyDirectoryError extends InvalidConfigurationFileError {
  path;

  constructor(message, path) {
    super();
    this.message = message;
    this.path = path;
  }
}

export class InvalidSettingError extends UserError {
  pointer;

  constructor(message, pointer) {
    super();
    this.message = message;
    this.pointer = pointer;
  }

  withPrefix(prefix) {
    return new InvalidSettingError(this.message, `/${prefix}${this.pointer}`);
  }
}

export class DeployKeyAlreadyExistsError extends UserError {}
