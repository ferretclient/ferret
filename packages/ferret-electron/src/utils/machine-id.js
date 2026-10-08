/*
 * Derived from node-machine-id — https://github.com/automation-stack/node-machine-id
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Aleksandr Komlev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// The returned id seeds the key in utils/encryption.js — any change to how it is
// read or normalised makes previously encrypted secrets undecryptable.

const { execSync } = require('child_process');
const { createHash } = require('crypto');
const reg = require('native-reg');

const { platform } = process;

const isWindowsProcessMixedOrNativeArchitecture = () => {
  if (process.platform !== 'win32') {
    return '';
  }
  // 32-bit node on 64-bit Windows must go through sysnative to reach the real REG.exe
  if (process.arch === 'ia32' && Object.prototype.hasOwnProperty.call(process.env, 'PROCESSOR_ARCHITEW6432')) {
    return 'mixed';
  }
  return 'native';
};

const win32RegBinPath = {
  native: '%windir%\\System32',
  mixed: '%windir%\\sysnative\\cmd.exe /c %windir%\\System32'
};

const guidCommand = {
  darwin: 'ioreg -rd1 -c IOPlatformExpertDevice',
  win32:
    `${win32RegBinPath[isWindowsProcessMixedOrNativeArchitecture()]}\\REG.exe `
    + 'QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography '
    + '/v MachineGuid',
  linux: '( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :',
  freebsd: 'kenv -q smbios.system.uuid || sysctl -n kern.hostuuid'
};

const hash = (guid) => createHash('sha256').update(guid).digest('hex');

const expose = (result) => {
  switch (platform) {
    case 'darwin':
      return result
        .split('IOPlatformUUID')[1]
        .split('\n')[0]
        .replace(/\=|\s+|\"/gi, '')
        .toLowerCase();
    case 'win32':
      return result
        .toString()
        .split('REG_SZ')[1]
        .replace(/\r+|\n+|\s+/gi, '')
        .toLowerCase();
    case 'linux':
    case 'freebsd':
      return result
        .toString()
        .replace(/\r+|\n+|\s+/gi, '')
        .toLowerCase();
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
};

const getWindowsMachineId = () => {
  return reg.getValue(reg.HKEY.LOCAL_MACHINE, 'SOFTWARE\\Microsoft\\Cryptography', 'MachineGuid').toString();
};

const machineIdSync = (original) => {
  let error;
  try {
    const id = expose(execSync(guidCommand[platform]).toString());
    return original ? id : hash(id);
  } catch (e) {
    // fall through to the registry read on Windows before giving up
    error = e;
  }
  if (platform === 'win32') {
    try {
      const id = getWindowsMachineId();
      return original ? id : hash(id);
    } catch (e) {
      throw new Error(`Error while obtaining machine id via native-reg: ${e.stack}`);
    }
  }
  throw new Error(`Error while obtaining machine id: ${error.stack}`);
};

module.exports = { machineIdSync };
