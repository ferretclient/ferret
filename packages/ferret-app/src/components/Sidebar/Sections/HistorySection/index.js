import { useState } from 'react';
import { IconHistory, IconTrash } from '@tabler/icons';
import toast from 'react-hot-toast';
import SidebarSection from 'components/Sidebar/SidebarSection';
import HistoryList from 'components/History/HistoryList';
import ConfirmClearHistory from 'components/History/ConfirmClearHistory';
import ActionIcon from 'ui/ActionIcon';
import { clearRequestHistory } from 'hooks/useRequestHistory';

const HistorySection = () => {
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleClear = async () => {
    try {
      await clearRequestHistory();
      toast.success('History cleared');
    } catch (err) {
      toast.error(err?.message || 'Could not clear history');
    } finally {
      setConfirmingClear(false);
    }
  };

  const sectionActions = (
    <ActionIcon label="Clear history" onClick={() => setConfirmingClear(true)} data-testid="history-clear-btn">
      <IconTrash size={14} stroke={1.5} aria-hidden="true" />
    </ActionIcon>
  );

  return (
    <>
      {confirmingClear ? <ConfirmClearHistory onConfirm={handleClear} onClose={() => setConfirmingClear(false)} /> : null}
      <SidebarSection
        id="history"
        title="History"
        icon={IconHistory}
        actions={sectionActions}
        className="history-section"
      >
        <HistoryList />
      </SidebarSection>
    </>
  );
};

export default HistorySection;
