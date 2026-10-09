import React from 'react';
import Portal from 'components/Portal';
import Modal from 'components/Modal';

const ConfirmClearHistory = ({ onConfirm, onClose }) => (
  <Portal>
    <Modal
      size="sm"
      title="Clear history"
      confirmText="Clear"
      confirmButtonColor="danger"
      handleConfirm={onConfirm}
      handleCancel={onClose}
      dataTestId="history-clear-modal"
    >
      Delete every saved request and response from history? This cannot be undone.
    </Modal>
  </Portal>
);

export default ConfirmClearHistory;
