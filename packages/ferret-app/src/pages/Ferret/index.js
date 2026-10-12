import React, { useState, useRef, useEffect } from 'react';
import classnames from 'classnames';
import ManageWorkspace from 'components/ManageWorkspace';
import RequestTabs from 'components/RequestTabs';
import RequestTabPanel from 'components/RequestTabPanel';
import AppPreviewKeepAlive from 'components/AppPreviewKeepAlive';
import Sidebar from 'components/Sidebar';
import OpenCollection from 'components/Sidebar/OpenCollection';
import StatusBar from 'components/StatusBar';
import AppTitleBar from 'components/AppTitleBar';
import TabPanelErrorBoundary from 'components/RequestTabPanel/TabPanelErrorBoundary';
// import ErrorCapture from 'components/ErrorCapture';
import { useSelector } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';
import IslandsLayout from './IslandsLayout/index';
import { useTheme } from 'providers/Theme';
import 'swagger-ui-react/swagger-ui.css';
import Devtools from 'components/Devtools';
import useGrpcEventListeners from 'utils/network/grpc-event-listeners';
import useWsEventListeners from 'utils/network/ws-event-listeners';
import Portal from 'components/Portal';
import SaveTransientRequestContainer from 'components/SaveTransientRequest/Container';
import SaveTransientRequest from 'components/SaveTransientRequest';

const TransientRequestModalsRenderer = ({ modals }) => {
  if (modals.length === 0) {
    return null;
  }

  if (modals.length === 1) {
    return (
      <SaveTransientRequest
        item={modals[0].item}
        collection={modals[0].collection}
        isOpen={true}
        closeAfterSave={modals[0].closeAfterSave}
      />
    );
  }

  return <SaveTransientRequestContainer />;
};

export default function Main() {
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isDragging = useSelector((state) => state.app.isDragging);
  const showManageWorkspacePage = useSelector((state) => state.app.showManageWorkspacePage);
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);
  const saveTransientRequestModals = useSelector((state) => state.collections.saveTransientRequestModals);

  const { layout } = useTheme();
  const mainSectionRef = useRef(null);
  const [showRosettaBanner, setShowRosettaBanner] = useState(false);
  // Kept as state, not written onto an element, so either layout renders it correctly after a switch.
  const [appLoaded, setAppLoaded] = useState(false);

  // Initialize event listeners
  useGrpcEventListeners();
  useWsEventListeners();

  const className = classnames({
    'is-dragging': isDragging
  });

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const { ipcRenderer } = window;

    const removeAppLoadedListener = ipcRenderer.on('main:app-loaded', (init) => {
      setAppLoaded(true);
      setShowRosettaBanner(init.isRunningInRosetta);
    });

    return () => {
      removeAppLoadedListener();
    };
  }, []);

  // What sits next to the sidebar. Both layouts show it; only the arrangement around it differs.
  const mainContent = showManageWorkspacePage ? (
    <ManageWorkspace />
  ) : (
    <>
      <RequestTabs />
      <div className="relative flex flex-col flex-grow overflow-hidden">
        <TabPanelErrorBoundary key={activeTabUid} tabUid={activeTabUid}>
          <RequestTabPanel key={activeTabUid} />
        </TabPanelErrorBoundary>
        <AppPreviewKeepAlive />
      </div>
    </>
  );

  return (
    // <ErrorCapture>
    <div id="main-container" className="flex flex-col h-screen max-h-screen overflow-hidden">
      <AppTitleBar />
      {showRosettaBanner ? (
        <Portal>
          <div className="fixed bottom-0 left-0 right-0 z-10 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3" role="alert">
            <strong className="font-bold">WARNING:</strong>
            <div>
              It looks like Ferret was launched as the Intel (x64) build under Rosetta on your Apple Silicon Mac. This can cause reduced performance and unexpected behavior.
            </div>
            <button className="absolute right-2 top-0 text-xl" onClick={() => setShowRosettaBanner(!showRosettaBanner)}>
              &times;
            </button>
          </div>
        </Portal>
      ) : null}
      {layout === 'islands' ? (
        <IslandsLayout mainSectionRef={mainSectionRef} className={className} appState={appLoaded ? 'loaded' : 'loading'}>
          {mainContent}
        </IslandsLayout>
      ) : (
        <>
          <div
            ref={mainSectionRef}
            className="flex-1 min-h-0 flex"
            data-app-state={appLoaded ? 'loaded' : 'loading'}
            style={{
              height: isConsoleOpen ? `calc(100vh - 60px - ${isConsoleOpen ? '300px' : '0px'})` : 'calc(100vh - 60px)'
            }}
          >
            <StyledWrapper className={className} style={{ height: '100%', zIndex: 1 }}>
              <Sidebar />
              <section className="flex flex-grow flex-col overflow-hidden">
                {mainContent}
              </section>
            </StyledWrapper>
          </div>

          <Devtools mainSectionRef={mainSectionRef} />
        </>
      )}
      <StatusBar />
      <TransientRequestModalsRenderer modals={saveTransientRequestModals} />
      <OpenCollection />
    </div>
    // </ErrorCapture>
  );
}
