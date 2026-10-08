import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  openFolderSettingsByPath,
  selectFolderSettingsTab,
  selectRequestPaneTab,
  removeTag,
  saveFolderSettings
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_NAME = 'folder-tags';

test.describe('Folder Tags — remove', () => {
  test('drops the tags key from folder.fer when the last tag is removed', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);
    const folderFerPath = path.join(collectionFixturePath!, 'legacy', 'folder.fer');

    await openFolderSettingsByPath(page, COLLECTION_NAME, ['legacy']);
    await selectFolderSettingsTab(page, 'settings');

    await removeTag(page, 'wip');
    await expect(locators.tags.ownItems()).toHaveCount(0);

    await saveFolderSettings(page);

    await test.step('An emptied tag list leaves no tags key behind', async () => {
      const contents = fs.readFileSync(folderFerPath, 'utf8');
      expect(contents).not.toContain('tags');
      expect(contents).toContain('name: legacy');
    });

    await test.step('The tag stops cascading to requests in the folder', async () => {
      await locators.sidebar.itemsIn(COLLECTION_NAME, 'inherits-wip').click();
      await expect(locators.tabs.activeRequestTab()).toContainText('inherits-wip');
      await selectRequestPaneTab(page, 'Settings');

      await expect(locators.tags.ownItem('smoke')).toBeVisible();
      await expect(locators.tags.inheritedToggle()).toBeHidden();
    });
  });
});
