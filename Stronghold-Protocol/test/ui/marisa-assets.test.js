import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bandIconUrl } from '../../public/js/ui/assetUrls.js';

test('namespaced Kun strategy resolves the original icon through the UI asset resolver', () => {
  const assets = JSON.parse(fs.readFileSync(new URL('../../data/assets.json', import.meta.url), 'utf8'));
  assert.equal(bandIconUrl(assets, 'band_x_marisa_kun'), '/assets/band/band_kun.png');
  assert.equal(bandIconUrl(assets, 'band_x_marisa_kun'), bandIconUrl(assets, 'band_kun'));
});
