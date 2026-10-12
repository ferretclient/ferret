import React from 'react';
import { useTheme } from 'providers/Theme';
import { applyDesign, designRegistry } from 'themes/designs/index';

// A small window drawn with the current color theme and the given design, so the cards show what each
// design really does to corners, borders and depth.
const DesignPreview = ({ designId, baseTheme }) => {
  const theme = applyDesign(baseTheme, designId);

  return (
    <div
      className="design-preview"
      style={{
        background: theme.background.base,
        border: `1px solid ${theme.border.border1}`,
        borderRadius: theme.border.radius.lg,
        boxShadow: theme.shadow.md
      }}
    >
      <div className="design-preview-sidebar" style={{ background: theme.sidebar.bg }} />
      <div className="design-preview-main">
        <div
          className="design-preview-row"
          style={{ border: `1px solid ${theme.border.border1}`, borderRadius: theme.border.radius.base }}
        />
        <div
          className="design-preview-row"
          style={{ border: `1px solid ${theme.border.border1}`, borderRadius: theme.border.radius.base, width: '70%' }}
        />
        <div className="design-preview-button" style={{ background: theme.brand, borderRadius: theme.border.radius.base }} />
      </div>
    </div>
  );
};

const DesignPicker = () => {
  const { design, setDesign, baseTheme } = useTheme();

  return (
    <div className="theme-variant-section" data-testid="design-picker">
      <div className="theme-variant-label">Design</div>
      <div className="theme-variants" role="radiogroup" aria-label="Design">
        {Object.values(designRegistry).map((option) => {
          const isSelected = design === option.id;
          const select = () => setDesign(option.id);

          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              className={`theme-variant-card design-card ${isSelected ? 'selected' : ''}`}
              data-testid={`design-option-${option.id}`}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }}
            >
              <DesignPreview designId={option.id} baseTheme={baseTheme} />
              <span className="theme-variant-name">{option.name}</span>
              <span className="design-description">{option.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DesignPicker;
