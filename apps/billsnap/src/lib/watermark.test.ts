import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WATERMARK_TILE_COUNT,
  WATERMARK_URL,
  escapeXml,
  watermarkBackgroundDataUri,
  watermarkFooterText,
  watermarkHost,
  watermarkOverlayText,
} from './watermark.ts';

test('watermark copy includes the public site URL', () => {
  assert.equal(WATERMARK_URL, 'https://sendtheinvoice.com');
  assert.equal(watermarkHost(), 'sendtheinvoice.com');
  assert.equal(watermarkOverlayText(), 'Billsnap · sendtheinvoice.com');
  assert.equal(watermarkFooterText(), 'Created with Billsnap · https://sendtheinvoice.com');
  assert.ok(WATERMARK_TILE_COUNT >= 24);
});

test('watermark background encodes the overlay text as an SVG data URI', () => {
  const uri = watermarkBackgroundDataUri();
  assert.match(uri, /^url\("data:image\/svg\+xml,/);
  assert.ok(uri.includes(encodeURIComponent('Billsnap · sendtheinvoice.com')));
});

test('escapeXml encodes markup so watermark SVG cannot inject tags', () => {
  assert.equal(
    escapeXml(`<script a="1" b='2'>&`),
    '&lt;script a=&quot;1&quot; b=&apos;2&apos;&gt;&amp;',
  );
});
