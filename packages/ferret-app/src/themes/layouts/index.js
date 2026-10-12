// A layout is how the main screen is arranged. It is separate from the design (shape and depth) and from the
// color theme, so any combination works. Classic is the arrangement Ferret started with; Islands lifts the
// sidebar, the editor and the console into separate rounded surfaces with space between them.

export const DEFAULT_LAYOUT = 'classic';

export const layoutRegistry = {
  classic: {
    id: 'classic',
    name: 'Classic panes',
    description: 'Panes that fill the window edge to edge, divided by thin lines. The arrangement Ferret started with.'
  },
  islands: {
    id: 'islands',
    name: 'Islands',
    description: 'The sidebar, the editor and the console are separate rounded islands with space between them.'
  }
};

export const isKnownLayout = (id) => Object.prototype.hasOwnProperty.call(layoutRegistry, id);
