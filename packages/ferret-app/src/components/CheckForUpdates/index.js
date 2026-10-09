import React, { useRef, useState } from 'react';
import { IconRefresh } from '@tabler/icons';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import { describeUpdateResult } from 'utils/updates';
import { version as appVersion } from '../../../package.json';

const REPOSITORY = 'jakahann/ferret-app';

const UpdateResultModal = ({ result, onClose }) => {
  const description = describeUpdateResult(result);

  const openReleasePage = () => {
    window.ipcRenderer.openExternal(result.url);
    onClose();
  };

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

// Nothing leaves this computer until the user answers "Yes, check" in the first dialog.
const CheckForUpdates = () => {
  const [phase, setPhase] = useState('closed');
  const [result, setResult] = useState(null);
  // Lets a check that finishes after the user cancelled be ignored instead of reopening the dialog.
  const activeCheckRef = useRef(0);

  const close = () => {
    activeCheckRef.current += 1;
    setPhase('closed');
    setResult(null);
  };

  const runCheck = async () => {
    const checkId = ++activeCheckRef.current;
    setPhase('checking');
    let outcome;
    try {
      outcome = await window.ipcRenderer.invoke('renderer:check-for-updates');
    } catch (error) {
      outcome = { status: 'error', message: error?.message };
    }
    if (checkId !== activeCheckRef.current) return;
    setResult(outcome);
    setPhase('result');
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
              <li>Nothing is downloaded or installed. If a newer version exists you can open its page in your browser.</li>
            </ul>
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

      {phase === 'result' && <UpdateResultModal result={result} onClose={close} />}
    </>
  );
};

export default CheckForUpdates;
