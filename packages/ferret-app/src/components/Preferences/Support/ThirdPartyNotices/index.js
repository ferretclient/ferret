import React from 'react';
import { IconLicense } from '@tabler/icons';
import { toastError } from 'utils/common/error';

// Opens THIRD_PARTY_NOTICES.md, the licenses of the open-source software and assets Ferret includes.
const ThirdPartyNotices = () => {
  const open = () => {
    window.ipcRenderer
      .invoke('renderer:open-third-party-notices')
      .catch((error) => toastError(error, 'Could not open the third-party notices'));
  };

  return (
    <button type="button" className="support-link" onClick={open} data-testid="support-third-party-notices">
      <span className="support-link-tile">
        <IconLicense size={16} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="support-link-text">
        <span className="support-link-label">Third-party notices</span>
        <span className="support-link-description">The licenses of the open-source software and assets Ferret includes.</span>
      </span>
    </button>
  );
};

export default ThirdPartyNotices;
