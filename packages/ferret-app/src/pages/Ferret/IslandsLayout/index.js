import React from 'react';
import { useSelector } from 'react-redux';
import Sidebar from 'components/Sidebar';
import Devtools from 'components/Devtools';
import StyledWrapper from '../StyledWrapper';

/**
 * The islands arrangement of the main screen: the sidebar, the editor and the console are separate rounded
 * surfaces with space between them, laid out with flexbox instead of the fixed heights the classic layout uses.
 * It shows the same components as the classic layout, so everything works the same; only the arrangement and
 * its styling (styles/layout-islands.css) differ.
 *
 * `mainSectionRef` is the row holding the sidebar and the editor: it carries the app's loading state (`appState`)
 * and the console measures against it, exactly as in the classic layout.
 */
const IslandsLayout = ({ mainSectionRef, className, appState = 'loading', children }) => {
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);

  return (
    <div className="islands-shell flex flex-col flex-1 min-h-0" data-testid="islands-layout">
      <div ref={mainSectionRef} className="islands-row flex flex-1 min-h-0" data-app-state={appState}>
        {/* `display: contents` keeps the wrapper's drag cursor and nested rules without adding a box of its own. */}
        <StyledWrapper className={className} style={{ display: 'contents' }}>
          {/* The sidebar stays mounted while hidden, so its state and shortcuts survive being collapsed. */}
          <div className="island island-sidebar" data-testid="island-sidebar" hidden={sidebarCollapsed}>
            <Sidebar />
          </div>
          <section className="island island-main flex flex-grow flex-col overflow-hidden" data-testid="island-main">
            {children}
          </section>
        </StyledWrapper>
      </div>
      {isConsoleOpen && (
        <div className="island island-console" data-testid="island-console">
          <Devtools mainSectionRef={mainSectionRef} />
        </div>
      )}
    </div>
  );
};

export default IslandsLayout;
