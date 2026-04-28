import simpleGit, { SimpleGit } from "simple-git";
import { spawnSync } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

interface GitCommitOptions {
  repoPath: string;
  branch: string;
  files: string[];
  message: string;
  authorName?: string;
  authorEmail?: string;
  sshKeyPath?: string;
}

let tmpKeyFile: string | null = null;

function resolveSshKeyFile(sshKeyPath?: string): string | null {
  // Explicit path takes precedence
  if (sshKeyPath) {
    const expanded = sshKeyPath.replace(/^~/, process.env.HOME ?? "");
    return fs.existsSync(expanded) ? expanded : null;
  }

  const keyContent = process.env.SSH_PRIVATE_KEY;
  if (!keyContent) return null;

  // Key content: write to a process-scoped temp file once
  if (!tmpKeyFile) {
    const tmp = path.join(os.tmpdir(), `df-ssh-key-${process.pid}`);
    fs.writeFileSync(tmp, keyContent.replace(/\\n/g, "\n"), { mode: 0o600 });
    tmpKeyFile = tmp;
  }
  return tmpKeyFile;
}

function buildGitEnv(sshKeyPath?: string): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  const keyFile = resolveSshKeyFile(sshKeyPath);
  if (keyFile) {
    env["GIT_SSH_COMMAND"] = `ssh -i ${keyFile} -o StrictHostKeyChecking=no`;
  }
  return env;
}

export async function gitCommitAndPush(options: GitCommitOptions): Promise<void> {
  const { repoPath, branch, files, message, sshKeyPath } = options;
  const authorName = options.authorName ?? process.env.GIT_AUTHOR_NAME ?? "Agent";
  const authorEmail = options.authorEmail ?? process.env.GIT_AUTHOR_EMAIL ?? "agent@local";

  const env = buildGitEnv(sshKeyPath);

  const git: SimpleGit = simpleGit({
    baseDir: repoPath,
    binary: "git",
    maxConcurrentProcesses: 1,
    config: [],
  }).env(env);

  await git.fetch("origin");

  const branches = await git.branchLocal();
  if (branches.all.includes(branch)) {
    await git.checkout(branch);
    try {
      await git.pull("origin", branch, ["--ff-only"]);
    } catch {
      // Branch may not exist on remote yet; continue
    }
  } else {
    await git.checkoutBranch(branch, `origin/${branch}`).catch(async () => {
      await git.checkoutBranch(branch, "HEAD");
    });
  }

  for (const file of files) {
    const absolutePath = path.isAbsolute(file) ? file : path.join(repoPath, file);
    const relativePath = path.relative(repoPath, absolutePath);
    await git.add(relativePath);
  }

  await git.addConfig("user.name", authorName, false, "local");
  await git.addConfig("user.email", authorEmail, false, "local");

  await git.commit(message);
  await git.push("origin", branch);
}

export async function ensureBranch(repoPath: string, branch: string, sshKeyPath?: string): Promise<void> {
  const env = buildGitEnv(sshKeyPath);
  const git: SimpleGit = simpleGit({ baseDir: repoPath }).env(env);
  await git.fetch("origin");
  const branches = await git.branch(["-a"]);
  const remoteRef = `remotes/origin/${branch}`;
  if (!branches.all.includes(remoteRef)) {
    await git.checkoutBranch(branch, "HEAD");
    await git.push("origin", branch);
  }
}
