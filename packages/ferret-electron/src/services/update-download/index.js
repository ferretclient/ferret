const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isTrustedDownloadUrl } = require('../update-check');

// Release files are named ferret_<version>_<arch>_<os>.<ext>; anything else never reaches the disk.
const INSTALLER_NAME = /^ferret_[0-9A-Za-z._+-]+\.(exe|dmg|AppImage)$/;

// `sha256sum` writes "<hash>  <file>" (or "<hash> *<file>" in binary mode).
const findChecksum = (text, fileName) => {
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^([0-9a-f]{64})\s+\*?(.+?)\s*$/i.exec(line);
    if (match && match[2] === fileName) return match[1].toLowerCase();
  }
  return null;
};

// Windows keeps a file locked until its stream has really closed (and antivirus may hold it a moment longer),
// so wait for the close and retry the delete.
const closeStream = (stream) => new Promise((resolve) => {
  if (stream.closed) return resolve();
  stream.once('close', resolve);
  stream.destroy();
});
const removeFile = (file) => fs.promises.rm(file, { force: true, maxRetries: 5, retryDelay: 100 });

const requireOk = (response, what) => {
  if (!response?.ok) throw new Error(`GitHub answered with HTTP ${response?.status} for ${what}.`);
};

/**
 * Downloads `installer` (from pickInstaller) into `directory` and returns the file's path. The file is
 * written under a temporary name, compared with the checksum published in the same release, and only then
 * renamed, so a partial or altered download is deleted and never offered for installation.
 * `onProgress({ received, total })` reports bytes; aborting `signal` cancels the download.
 */
const downloadInstaller = async ({ installer, directory, fetchImpl, onProgress, signal }) => {
  if (!isTrustedDownloadUrl(installer?.url) || !isTrustedDownloadUrl(installer?.checksumsUrl)) {
    throw new Error('The download address is not a Ferret release.');
  }
  if (!INSTALLER_NAME.test(installer.name)) throw new Error('The installer has an unexpected file name.');

  const checksumsResponse = await fetchImpl(installer.checksumsUrl, { signal });
  requireOk(checksumsResponse, 'the checksum file');
  const expected = findChecksum(await checksumsResponse.text(), installer.name);
  if (!expected) throw new Error(`No checksum is published for ${installer.name}.`);

  await fs.promises.mkdir(directory, { recursive: true });
  const target = path.join(directory, installer.name);
  const partial = `${target}.part`;

  const response = await fetchImpl(installer.url, { signal });
  requireOk(response, installer.name);
  if (!response.body) throw new Error('GitHub sent no file data.');
  const total = Number(response.headers?.get?.('content-length')) || installer.size || 0;

  const hash = crypto.createHash('sha256');
  const output = fs.createWriteStream(partial);
  const failed = new Promise((_, reject) => output.once('error', reject));
  failed.catch(() => {});
  const reader = response.body.getReader();
  let received = 0;
  try {
    for (;;) {
      if (signal?.aborted) throw new Error('The download was cancelled.');
      const { done, value } = await Promise.race([reader.read(), failed]);
      if (done) break;
      hash.update(value);
      received += value.length;
      if (!output.write(value)) await Promise.race([new Promise((resolve) => output.once('drain', resolve)), failed]);
      onProgress?.({ received, total });
    }
    await Promise.race([new Promise((resolve) => {
      output.once('close', resolve); output.end();
    }), failed]);
  } catch (error) {
    reader.cancel?.().catch(() => {});
    await closeStream(output);
    await removeFile(partial);
    throw error;
  }

  if (hash.digest('hex') !== expected) {
    await removeFile(partial);
    throw new Error('The downloaded file does not match its published checksum, so it was discarded.');
  }
  await removeFile(target);
  await fs.promises.rename(partial, target);
  return target;
};

module.exports = { downloadInstaller, findChecksum, INSTALLER_NAME };
