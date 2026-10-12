import React, { useRef, useState } from 'react';
import { IconRefresh } from '@tabler/icons';
import Checkbox from 'ui/Checkbox';
import useLocalStorage from 'hooks/useLocalStorage';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { describeUpdateResult, describeInstallAction, formatDownloadSize, downloadPercent } from 'utils/updates';
import { version as appVersion } from '../../../package.json';

const REPOSITORY = 'ferretclient/ferret';
const DOWNLOAD_PROGRESS_CHANNEL = 'main:update-download-progress';

const UpdateResultModal = ({ result, onClose, onDownload }) => {
  const description = describeUpdateResult(result);

  const openReleasePage = () => {
    window.ipcRenderer.openExternal(result.url);
    onClose();
  };

  if (description.canDownload) {
    const size = formatDownloadSize(result.installer.size);
    return (
      <Portal>
        <Modal
          size="md"
          title="Check for updates"
          confirmText={size ? `Download update (${size})` : 'Download update'}
          cancelText="Close"
          handleConfirm={onDownload}
          handleCancel={onClose}
          dataTestId="check-for-updates-result-modal"
        >
          <p data-testid="check-for-updates-result">{description.message}</p>
          {description.note && <p className="mt-2 text-muted">{description.note}</p>}
          <p className="mt-2 text-muted">
            Downloading starts only when you choose it, from the releases of <code>{REPOSITORY}</code> on GitHub, and
            the file is checked against the checksum published with the release before it can be installed.{' '}
            <button type="button" className="text-link" onClick={openReleasePage} data-testid="check-for-updates-open-release-page">
              View the release page instead
            </button>
          </p>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal
        size="md"
        title="Check for updates"
        confirmText={description.canOpenReleasePage ? 'Open release page' : 'Close'}
        cancelText="Close"
        hideCancel={!description.canOpenReleasePage}
        handleConfirm={description.canOpenReleasePage ? openReleasePage : onClose}
        handleCancel={onClose}
        dataTestId="check-for-updates-result-modal"
      >
        <p data-testid="check-for-updates-result">{description.message}</p>
        {description.note && <p className="mt-2 text-muted">{description.note}</p>}
      </Modal>
    </Portal>
  );
};

const DownloadingModal = ({ result, progress, onCancel }) => {
  const percent = downloadPercent(progress);
  return (
    <Portal>
      <Modal
        size="md"
        title="Check for updates"
        confirmText={percent === null ? 'Downloading…' : `Downloading… ${percent}%`}
        confirmDisabled
        cancelText="Cancel download"
        handleCancel={onCancel}
        dataTestId="check-for-updates-downloading-modal"
      >
        <p>Downloading {result.installer.name}…</p>
        <progress
          className="w-full mt-3"
          max={100}
          value={percent === null ? undefined : percent}
          data-testid="check-for-updates-progress"
        />
      </Modal>
    </Portal>
  );
};

const ReadyModal = ({ result, onInstall, onClose }) => {
  const action = describeInstallAction(result.installer);
  return (
    <Portal>
      <Modal
        size="md"
        title="Check for updates"
        confirmText={action.label}
        cancelText="Later"
        handleConfirm={onInstall}
        handleCancel={onClose}
        dataTestId="check-for-updates-ready-modal"
      >
        <p data-testid="check-for-updates-ready">
          Version {result.latestVersion} was downloaded and its checksum matches the one published with the release.
        </p>
        <p className="mt-2 text-muted">{action.note}</p>
      </Modal>
    </Portal>
  );
};

const FailedModal = ({ result, message, onClose }) => {
  const openReleasePage = () => {
    window.ipcRenderer.openExternal(result.url);
    onClose();
  };
  return (
    <Portal>
      <Modal
        size="md"
        title="Check for updates"
        confirmText="Open release page"
        cancelText="Close"
        handleConfirm={openReleasePage}
        handleCancel={onClose}
        dataTestId="check-for-updates-failed-modal"
      >
        <p data-testid="check-for-updates-failed">The update could not be installed.</p>
        <p className="mt-2 text-muted">{message}</p>
      </Modal>
    </Portal>
  );
};

const InstalledModal = ({ result, onClose }) => (
  <Portal>
    <Modal
      size="md"
      title="Check for updates"
      confirmText="Close"
      hideCancel
      handleConfirm={onClose}
      handleCancel={onClose}
      dataTestId="check-for-updates-installed-modal"
    >
      <p data-testid="check-for-updates-installed">{describeInstallAction(result.installer).note}</p>
    </Modal>
  </Portal>
);

// Nothing leaves this computer until the user answers "Yes, check" in the first dialog, and nothing is
// downloaded or started until they choose it in the dialogs that follow.
const CheckForUpdates = () => {
  const [phase, setPhase] = useState('closed');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [failure, setFailure] = useState('');
  const [allowBeta, setAllowBeta] = useLocalStorage('ferret.allowBetaUpdates', false);
  // Lets a check or download that finishes after the user cancelled be ignored instead of reopening a dialog.
  const activeRef = useRef(0);

  const close = () => {
    if (phase === 'downloading') window.ipcRenderer.invoke('renderer:cancel-update-download').catch(() => {});
    activeRef.current += 1;
    setPhase('closed');
    setResult(null);
    setFailure('');
  };

  const runCheck = async () => {
    const checkId = ++activeRef.current;
    setPhase('checking');
    let outcome;
    try {
      outcome = await window.ipcRenderer.invoke('renderer:check-for-updates', { allowBeta: allowBeta === true });
    } catch (error) {
      outcome = { status: 'error', message: error?.message };
    }
    if (checkId !== activeRef.current) return;
    setResult(outcome);
    setPhase('result');
  };

  const runDownload = async () => {
    const downloadId = ++activeRef.current;
    setProgress({ received: 0, total: result.installer.size || 0 });
    setPhase('downloading');
    const unsubscribe = window.ipcRenderer.on(DOWNLOAD_PROGRESS_CHANNEL, (update) => {
      if (downloadId === activeRef.current) setProgress(update);
    });
    try {
      await window.ipcRenderer.invoke('renderer:download-update');
      if (downloadId === activeRef.current) setPhase('ready');
    } catch (error) {
      if (downloadId !== activeRef.current) return;
      setFailure(error?.message || 'The download failed.');
      setPhase('failed');
    } finally {
      unsubscribe?.();
    }
  };

  const runInstall = async () => {
    const installId = ++activeRef.current;
    setPhase('installing');
    try {
      await window.ipcRenderer.invoke('renderer:install-update');
      if (installId === activeRef.current) setPhase('installed');
    } catch (error) {
      if (installId !== activeRef.current) return;
      setFailure(error?.message || 'The installer could not be started.');
      setPhase('failed');
    }
  };

  return (
    <>
      <button
        type="button"
        className="support-link"
        onClick={() => setPhase('confirm')}
        data-testid="support-check-for-updates"
      >
        <span className="support-link-tile">
          <IconRefresh size={16} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="support-link-text">
          <span className="support-link-label">Check for updates</span>
          <span className="support-link-description">
            You are running version {appVersion}. Ferret only looks for a new version when you ask it to.
          </span>
        </span>
      </button>

      {phase === 'confirm' && (
        <Portal>
          <Modal
            size="md"
            title="Check for updates"
            confirmText="Yes, check"
            cancelText="Cancel"
            handleConfirm={runCheck}
            handleCancel={close}
            dataTestId="check-for-updates-confirm-modal"
          >
            <p>
              Ferret never connects to the internet on its own. Checking for updates sends one request from this
              computer to GitHub (<code>api.github.com</code>) to read the list of published releases of{' '}
              <code>{REPOSITORY}</code>.
            </p>
            <ul className="list-disc ml-5 my-3">
              <li>GitHub can see your IP address and that a Ferret app asked.</li>
              <li>No collections, requests, environments or other personal data are sent.</li>
              <li>
                Nothing is downloaded or installed by the check. If a newer version exists you can then choose to
                download it, or open its page in your browser.
              </li>
            </ul>
            <Checkbox
              checked={allowBeta === true}
              onChange={(event) => setAllowBeta(event.target.checked)}
              label="Allow beta updates"
              className="mb-1"
              data-testid="check-for-updates-allow-beta"
            />
            <p className="mb-3 text-muted">
              Normally only official versions are offered. With this on, beta versions (release candidates) are
              offered too. They are for trying new features and may have bugs.
            </p>
            <p>Do you want to continue?</p>
          </Modal>
        </Portal>
      )}

      {phase === 'checking' && (
        <Portal>
          <Modal
            size="md"
            title="Check for updates"
            confirmText="Checking…"
            confirmDisabled
            handleCancel={close}
            dataTestId="check-for-updates-checking-modal"
          >
            Asking GitHub for the latest release…
          </Modal>
        </Portal>
      )}

      {phase === 'result' && <UpdateResultModal result={result} onClose={close} onDownload={runDownload} />}
      {phase === 'downloading' && <DownloadingModal result={result} progress={progress} onCancel={close} />}
      {phase === 'ready' && <ReadyModal result={result} onInstall={runInstall} onClose={close} />}
      {phase === 'installing' && (
        <Portal>
          <Modal
            size="md"
            title="Check for updates"
            confirmText="Starting…"
            confirmDisabled
            hideCancel
            handleCancel={close}
            dataTestId="check-for-updates-installing-modal"
          >
            Starting the installer…
          </Modal>
        </Portal>
      )}
      {phase === 'installed' && <InstalledModal result={result} onClose={close} />}
      {phase === 'failed' && <FailedModal result={result} message={failure} onClose={close} />}
    </>
  );
};

export default CheckForUpdates;
