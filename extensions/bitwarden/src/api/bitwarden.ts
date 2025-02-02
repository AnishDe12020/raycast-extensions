import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { execa, ExecaChildProcess, ExecaError } from "execa";
import { existsSync } from "fs";
import { dirname } from "path/posix";
import { LOCAL_STORAGE_KEY, DEFAULT_SERVER_URL } from "~/constants/general";
import { VaultState, VaultStatus } from "~/types/general";
import { Preferences } from "~/types/preferences";
import { PasswordGeneratorOptions } from "~/types/passwords";
import { Folder, Item } from "~/types/vault";
import { getPasswordGeneratingArgs } from "~/utils/passwords";
import { getServerUrlPreference } from "~/utils/preferences";
import { CLINotFoundError } from "~/utils/errors";

export class Bitwarden {
  private env: Env;
  private initPromise: Promise<void>;
  private tempSessionToken: string | undefined;
  lockReason: string | undefined;
  cliPath: string;

  constructor() {
    const { cliPath, clientId, clientSecret, serverCertsPath } = getPreferenceValues<Preferences>();
    const serverUrl = getServerUrlPreference();
    this.cliPath = cliPath || (process.arch == "arm64" ? "/opt/homebrew/bin/bw" : "/usr/local/bin/bw");

    if (!existsSync(this.cliPath)) {
      throw new CLINotFoundError(`Bitwarden CLI not found at ${this.cliPath}`);
    }

    this.env = {
      BITWARDENCLI_APPDATA_DIR: environment.supportPath,
      BW_CLIENTSECRET: clientSecret.trim(),
      BW_CLIENTID: clientId.trim(),
      PATH: dirname(process.execPath),
      ...(serverUrl && serverCertsPath ? { NODE_EXTRA_CA_CERTS: serverCertsPath } : {}),
    };

    this.initPromise = (async () => {
      await this.checkServerUrl(serverUrl);
      this.lockReason = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON);
    })();
  }

  setSessionToken(token: string) {
    this.env = {
      ...this.env,
      BW_SESSION: token,
    };
  }

  clearSessionToken() {
    delete this.env.BW_SESSION;
  }

  withSession(token: string) {
    this.tempSessionToken = token;
    return this;
  }

  async initialize() {
    await this.initPromise;
    return this;
  }

  async checkServerUrl(serverUrl: string): Promise<void> {
    // Check the CLI has been configured to use the preference Url
    const cliServer = (await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SERVER_URL)) || "";
    if (cliServer === serverUrl) return;

    // Update the server Url
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Switching server...",
      message: "Bitwarden server preference changed",
    });
    try {
      try {
        await this.logout();
      } catch {
        // It doesn't matter if we weren't logged in.
      }
      // If URL is empty, set it to the default
      await this.exec(["config", "server", serverUrl || DEFAULT_SERVER_URL]);
      await LocalStorage.setItem(LOCAL_STORAGE_KEY.SERVER_URL, serverUrl);

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "Bitwarden server changed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to switch server";
      if (error instanceof Error) {
        toast.message = error.message;
      } else {
        toast.message = "Unknown error occurred";
      }
    }
  }

  private async setLockReason(reason: string) {
    this.lockReason = reason;
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON, reason);
  }

  private async clearLockReason(): Promise<void> {
    if (this.lockReason) {
      await LocalStorage.removeItem(LOCAL_STORAGE_KEY.VAULT_LOCK_REASON);
      this.lockReason = undefined;
    }
  }

  private async exec(args: string[], options?: ExecProps): Promise<ExecaChildProcess> {
    const { abortController, input = "", skipLastActivityUpdate = false } = options ?? {};
    let env = this.env;
    if (this.tempSessionToken) env = { ...env, BW_SESSION: this.tempSessionToken };
    const result = await execa(this.cliPath, args, { env, input, signal: abortController?.signal });

    if (!skipLastActivityUpdate) {
      await LocalStorage.setItem(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME, new Date().toISOString());
    }
    if (this.tempSessionToken) {
      this.tempSessionToken = undefined;
    }
    return result;
  }

  async sync(): Promise<void> {
    await this.exec(["sync"]);
  }

  async login(): Promise<void> {
    await this.exec(["login", "--apikey"]);
    await this.clearLockReason();
  }

  async logout(): Promise<void> {
    await this.exec(["logout"]);
    this.clearSessionToken();
  }

  async listItems(): Promise<Item[]> {
    const { stdout } = await this.exec(["list", "items"]);
    const items = JSON.parse<Item[]>(stdout);
    // Filter out items without a name property (they are not displayed in the bitwarden app)
    return items.filter((item: Item) => !!item.name);
  }

  async listFolders(): Promise<Folder[]> {
    const { stdout } = await this.exec(["list", "folders"]);
    return JSON.parse<Folder[]>(stdout);
  }

  async getTotp(id: string): Promise<string> {
    // this could return something like "Not found." but checks for totp code are done before calling this function
    const { stdout } = await this.exec(["get", "totp", id]);
    return stdout;
  }

  async unlock(password: string): Promise<string> {
    const { stdout: sessionToken } = await this.exec(["unlock", password, "--raw"]);
    await this.clearLockReason();
    return sessionToken;
  }

  async lock(reason?: string): Promise<void> {
    if (reason) await this.setLockReason(reason);
    await this.exec(["lock"]);
  }

  async status(): Promise<VaultState> {
    const { stdout } = await this.exec(["status"]);
    return JSON.parse(stdout);
  }

  async checkLockStatus(): Promise<VaultStatus> {
    try {
      await this.exec(["unlock", "--check"]);
      return "unlocked";
    } catch (error) {
      const errorMessage = (error as ExecaError).stderr;
      if (errorMessage === "Vault is locked.") return "locked";
      return "unauthenticated";
    }
  }

  async generatePassword(options?: PasswordGeneratorOptions, abortController?: AbortController): Promise<string> {
    const args = options ? getPasswordGeneratingArgs(options) : [];
    const { stdout } = await this.exec(["generate", ...args], { abortController });
    return stdout;
  }
}

type Env = {
  BITWARDENCLI_APPDATA_DIR: string;
  BW_CLIENTSECRET: string;
  BW_CLIENTID: string;
  PATH: string;
  NODE_EXTRA_CA_CERTS?: string;
  BW_SESSION?: string;
};

type ExecProps = {
  abortController?: AbortController;
  skipLastActivityUpdate?: boolean;
  input?: string;
};
