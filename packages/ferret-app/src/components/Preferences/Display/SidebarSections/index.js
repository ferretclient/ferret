import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import ToggleSwitch from 'components/ToggleSwitch';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { isSidebarSectionVisible } from 'utils/sidebar/section-visibility';

const SECTIONS = [
  { id: 'api-specs', key: 'apiSpecs', label: 'API Specs' },
  { id: 'mock-servers', key: 'mockServers', label: 'Mock Servers' },
  { id: 'history', key: 'history', label: 'History' }
];

const SidebarSections = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const isMockServerEnabled = useBetaFeature(BETA_FEATURES.MOCK_SERVER);

  const setVisible = (key, visible) => {
    dispatch(savePreferences({
      ...preferences,
      display: {
        ...preferences.display,
        sidebarSections: {
          ...preferences.display?.sidebarSections,
          [key]: visible
        }
      }
    }));
  };

  return (
    <div data-testid="sidebar-sections-settings">
      <div className="font-medium mb-1">Sidebar sections</div>
      <div className="text-muted text-sm mb-3">
        Choose which sections appear in the left sidebar. Hiding a section only removes it from the sidebar; its features keep working.
      </div>
      <div className="flex flex-col gap-3">
        {SECTIONS.map(({ id, key, label }) => (
          <div className="flex items-center gap-3" key={id}>
            <ToggleSwitch
              size="xs"
              isOn={isSidebarSectionVisible(preferences, id)}
              handleToggle={() => setVisible(key, !isSidebarSectionVisible(preferences, id))}
              data-testid={`sidebar-section-visibility-${id}`}
            />
            <div>
              <div>Show {label}</div>
              {id === 'mock-servers' && !isMockServerEnabled && (
                <div className="text-muted text-xs">Mock Server is turned off under Beta, so it stays hidden either way.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidebarSections;
