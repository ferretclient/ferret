import welcome from './welcome.md';
import firstRequest from './first-request.md';
import variables from './variables.md';
import scriptsAndTests from './scripts-and-tests.md';
import collectionsAndRunner from './collections-and-runner.md';
import sidebarHistoryImport from './sidebar-history-import.md';
import shortcutsAndSettings from './shortcuts-and-settings.md';
import troubleshooting from './troubleshooting.md';

// In reading order. The Help tab lists them in this order and steps through them with Previous and Next.
export const HELP_PAGES = [
  { id: 'welcome', title: 'Welcome', content: welcome },
  { id: 'first-request', title: 'Your first request', content: firstRequest },
  { id: 'variables', title: 'Variables and environments', content: variables },
  { id: 'scripts-and-tests', title: 'Scripts and tests', content: scriptsAndTests },
  { id: 'collections-and-runner', title: 'Collections and the runner', content: collectionsAndRunner },
  { id: 'sidebar-history-import', title: 'Sidebar, history and importing', content: sidebarHistoryImport },
  { id: 'shortcuts-and-settings', title: 'Shortcuts and settings', content: shortcutsAndSettings },
  { id: 'troubleshooting', title: 'Troubleshooting', content: troubleshooting }
];
