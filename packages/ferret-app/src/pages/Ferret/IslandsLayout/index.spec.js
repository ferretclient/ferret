import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import IslandsLayout from './index';

// The sidebar and the console are large; this test is about how the layout arranges them.
jest.mock('components/Sidebar', () => () => <div data-testid="sidebar-stub" />);
jest.mock('components/Devtools', () => () => <div data-testid="console-stub" />);

const renderLayout = ({ sidebarCollapsed = false, isConsoleOpen = false, mainSectionRef = React.createRef() } = {}) => {
  const store = configureStore({
    reducer: () => ({ app: { sidebarCollapsed }, logs: { isConsoleOpen } })
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <IslandsLayout mainSectionRef={mainSectionRef} className="is-dragging">
          <div data-testid="editor-stub" />
        </IslandsLayout>
      </ThemeProvider>
    </Provider>
  );
  return mainSectionRef;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('ferret.theme', JSON.stringify('light'));
});

describe('IslandsLayout', () => {
  it('shows the sidebar and the editor as separate islands', () => {
    renderLayout();

    expect(screen.getByTestId('island-sidebar')).toContainElement(screen.getByTestId('sidebar-stub'));
    expect(screen.getByTestId('island-main')).toContainElement(screen.getByTestId('editor-stub'));
    expect(screen.getByTestId('island-sidebar')).not.toContainElement(screen.getByTestId('editor-stub'));
    expect(screen.getByTestId('island-sidebar')).toHaveClass('island');
    expect(screen.getByTestId('island-main')).toHaveClass('island');
  });

  it('hands the app the row that holds the sidebar and the editor, marked as still loading', () => {
    const ref = renderLayout();

    expect(ref.current).toHaveAttribute('data-app-state', 'loading');
    expect(ref.current).toContainElement(screen.getByTestId('island-main'));
    expect(screen.queryByTestId('island-console')).not.toBeInTheDocument();
  });

  it('shows the app state it is given, so the loaded mark survives a switch from the classic layout', () => {
    const store = configureStore({ reducer: () => ({ app: { sidebarCollapsed: false }, logs: { isConsoleOpen: false } }) });
    const ref = React.createRef();
    render(
      <Provider store={store}>
        <ThemeProvider>
          <IslandsLayout mainSectionRef={ref} className="" appState="loaded">
            <div />
          </IslandsLayout>
        </ThemeProvider>
      </Provider>
    );

    expect(ref.current).toHaveAttribute('data-app-state', 'loaded');
  });

  it('hides the sidebar island when the sidebar is collapsed, but keeps the sidebar mounted', () => {
    renderLayout({ sidebarCollapsed: true });

    expect(screen.getByTestId('island-sidebar')).toHaveAttribute('hidden');
    expect(screen.getByTestId('sidebar-stub')).toBeInTheDocument();
  });

  it('shows the sidebar island when the sidebar is open', () => {
    renderLayout({ sidebarCollapsed: false });

    expect(screen.getByTestId('island-sidebar')).not.toHaveAttribute('hidden');
  });

  it('adds a console island below only while the console is open', () => {
    renderLayout({ isConsoleOpen: true });

    expect(screen.getByTestId('island-console')).toContainElement(screen.getByTestId('console-stub'));
  });

  it('has no console island while the console is closed', () => {
    renderLayout({ isConsoleOpen: false });

    expect(screen.queryByTestId('island-console')).not.toBeInTheDocument();
    expect(screen.queryByTestId('console-stub')).not.toBeInTheDocument();
  });
});
