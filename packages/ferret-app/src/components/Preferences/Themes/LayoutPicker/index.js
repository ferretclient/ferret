import React from 'react';
import { useTheme } from 'providers/Theme';
import { layoutRegistry } from 'themes/layouts/index';

// A small drawing of each arrangement in the current theme's colors: panes that fill the window, or separate
// rounded islands on a canvas with space between them.
const ClassicPreview = ({ theme }) => (
  <div
    className="layout-preview"
    style={{ background: theme.background.base, border: `1px solid ${theme.border.border1}`, borderRadius: theme.border.radius.sm }}
  >
    <div className="layout-preview-block" style={{ width: 26, background: theme.sidebar.bg, borderRight: `1px solid ${theme.border.border1}` }} />
    <div className="layout-preview-block" style={{ flex: 1 }}>
      <div className="layout-preview-line" style={{ background: theme.border.border1 }} />
      <div className="layout-preview-line" style={{ background: theme.border.border1, width: '60%' }} />
    </div>
  </div>
);

const IslandsPreview = ({ theme }) => {
  const island = {
    background: theme.background.base,
    border: `1px solid ${theme.border.border1}`,
    borderRadius: theme.border.radius.base
  };
  return (
    <div
      className="layout-preview layout-preview-islands"
      style={{ background: theme.background.crust || theme.sidebar.bg, borderRadius: theme.border.radius.sm }}
    >
      <div className="layout-preview-block" style={{ ...island, width: 26, background: theme.sidebar.bg }} />
      <div className="layout-preview-column">
        <div className="layout-preview-block" style={{ ...island, flex: 1 }}>
          <div className="layout-preview-line" style={{ background: theme.border.border1 }} />
        </div>
        <div className="layout-preview-block" style={{ ...island, height: 12 }} />
      </div>
    </div>
  );
};

const PREVIEWS = { classic: ClassicPreview, islands: IslandsPreview };

const LayoutPicker = () => {
  const { layout, setLayout, theme } = useTheme();

  return (
    <div className="theme-variant-section" data-testid="layout-picker">
      <div className="theme-variant-label">Layout</div>
      <div className="theme-variants" role="radiogroup" aria-label="Layout">
        {Object.values(layoutRegistry).map((option) => {
          const isSelected = layout === option.id;
          const select = () => setLayout(option.id);
          const Preview = PREVIEWS[option.id];

          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              className={`theme-variant-card design-card ${isSelected ? 'selected' : ''}`}
              data-testid={`layout-option-${option.id}`}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }}
            >
              <Preview theme={theme} />
              <span className="theme-variant-name">{option.name}</span>
              <span className="design-description">{option.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayoutPicker;
