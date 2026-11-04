import assert from 'node:assert/strict';
import test from 'node:test';

import { isFridayNow } from '../lib/friday.js';

test('server identifies a Friday in the configured timezone', () => {
  const originalFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = class { format() { return 'Fri'; } };
  try { assert.equal(isFridayNow(), true); } finally { Intl.DateTimeFormat = originalFormat; }
});

test('server rejects a non-Friday in the configured timezone', () => {
  const originalFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = class { format() { return 'Tue'; } };
  try { assert.equal(isFridayNow(), false); } finally { Intl.DateTimeFormat = originalFormat; }
});
