import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

// A git remote for tests that clone or list branches, served from this machine so they need no network.
// The app only accepts git, ssh, http and https URLs, so the repository is served over plain HTTP using
// git's "dumb" protocol: a bare repository plus the index files `git update-server-info` writes.

const OWNER = 'ferret-sample';

const git = (cwd: string, args: string[]) => execFileSync('git', args, {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    GIT_AUTHOR_NAME: 'Ferret Tests',
    GIT_AUTHOR_EMAIL: 'tests@example.com',
    GIT_COMMITTER_NAME: 'Ferret Tests',
    GIT_COMMITTER_EMAIL: 'tests@example.com'
  }
}).toString().trim();

export interface LocalGitRemote {
  /** URL of the repository, for example http://127.0.0.1:51234/ferret-sample/my-collection.git */
  repositoryUrl: string;
  /** URL of a repository this server does not have, so listing its branches fails. */
  missingRepositoryUrl: string;
  close: () => Promise<void>;
}

export interface LocalGitRemoteOptions {
  repositoryName: string;
  /** Branches to create besides the default branch (`main`). */
  branches: string[];
}

const createRepository = (root: string, { repositoryName, branches }: LocalGitRemoteOptions) => {
  const work = path.join(root, 'work');
  fs.mkdirSync(work, { recursive: true });
  git(work, ['init', '--initial-branch=main']);

  fs.writeFileSync(path.join(work, 'ferret.json'), JSON.stringify({ version: '1', name: repositoryName, type: 'collection' }));
  fs.writeFileSync(path.join(work, 'ping.fer'), 'meta {\n  name: ping\n  type: http\n  seq: 1\n}\n\nget {\n  url: http://localhost/ping\n  body: none\n  auth: none\n}\n');
  git(work, ['add', '.']);
  git(work, ['commit', '-m', 'Initial commit']);
  for (const branch of branches) {
    git(work, ['branch', branch]);
  }

  const bare = path.join(root, 'served', OWNER, `${repositoryName}.git`);
  fs.mkdirSync(path.dirname(bare), { recursive: true });
  git(root, ['clone', '--bare', work, bare]);
  git(bare, ['update-server-info']);
  return path.join(root, 'served');
};

const serveDirectory = (directory: string) => http.createServer((request, response) => {
  const requested = path.normalize(path.join(directory, decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname)));
  if (!requested.startsWith(directory) || !fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(requested).size });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(requested).pipe(response);
});

export const startLocalGitRemote = async (options: LocalGitRemoteOptions): Promise<LocalGitRemote> => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-git-remote-'));
  const served = createRepository(root, options);
  const server = serveDirectory(served);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}/${OWNER}`;

  return {
    repositoryUrl: `${base}/${options.repositoryName}.git`,
    missingRepositoryUrl: `${base}/this-repo-does-not-exist.git`,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  };
};
