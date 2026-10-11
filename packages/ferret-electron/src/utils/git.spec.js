const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { parseRemoteBranches, initGit } = require('./git');

describe('parseRemoteBranches', () => {
  it('reads the branch names and the default branch out of ls-remote output', () => {
    const output = [
      'ref: refs/heads/main\tHEAD',
      '9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\tHEAD',
      '9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\trefs/heads/main',
      '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b\trefs/heads/feature/branch-selector'
    ].join('\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'feature/branch-selector'],
      defaultBranch: 'main'
    });
  });

  it('reads output written with CRLF line endings', () => {
    const output = ['ref: refs/heads/main\tHEAD', '9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/heads/develop'].join('\r\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: 'main'
    });
  });

  it('reports no default branch when the remote sends no symref line', () => {
    const output = ['9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/heads/develop'].join('\n');

    expect(parseRemoteBranches(output)).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: null
    });
  });

  it('ignores refs that are not branches', () => {
    const output = ['9c1f2a3\trefs/heads/main', '1a2b3c4\trefs/tags/v1.0.0', '2b3c4d5\trefs/pull/12/head'].join('\n');

    expect(parseRemoteBranches(output).branches).toEqual(['main']);
  });

  it('returns an empty listing for empty output', () => {
    expect(parseRemoteBranches('')).toEqual({ branches: [], defaultBranch: null });
    expect(parseRemoteBranches(undefined)).toEqual({ branches: [], defaultBranch: null });
  });
});

// Runs the real simple-git library, which the other tests never load, so a change in how it is imported or called
// shows up here instead of at runtime.
const gitAvailable = (() => {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

(gitAvailable ? describe : describe.skip)('initGit with the real simple-git', () => {
  it('creates a repository whose branch is main', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ferret-git-'));
    try {
      await initGit(directory);
      expect(fs.existsSync(path.join(directory, '.git'))).toBe(true);
      expect(execSync('git symbolic-ref --short HEAD', { cwd: directory }).toString().trim()).toBe('main');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
