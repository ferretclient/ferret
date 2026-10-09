import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SidebarAccordionProvider, useSidebarAccordion } from './SidebarAccordionContext';

const renderAccordion = (props) => renderHook(() => useSidebarAccordion(), {
  wrapper: ({ children }) => <SidebarAccordionProvider {...props}>{children}</SidebarAccordionProvider>
});

describe('SidebarAccordionProvider expanded count', () => {
  it('counts every expanded section when no visible list is given', () => {
    const { result } = renderAccordion({ defaultExpanded: ['collections', 'history'] });

    expect(result.current.getExpandedCount()).toBe(2);
  });

  it('does not count a hidden section that was left expanded', () => {
    const { result } = renderAccordion({
      defaultExpanded: ['collections', 'history'],
      visibleSectionIds: ['collections', 'api-specs']
    });

    expect(result.current.isExpanded('history')).toBe(true);
    expect(result.current.getExpandedCount()).toBe(1);
  });

  it('counts a section again once it is visible', () => {
    const wrapperProps = { defaultExpanded: ['collections'], visibleSectionIds: ['collections', 'api-specs'] };
    const { result } = renderAccordion(wrapperProps);

    act(() => result.current.setSectionExpanded('api-specs', true));

    expect(result.current.getExpandedCount()).toBe(2);
  });
});
