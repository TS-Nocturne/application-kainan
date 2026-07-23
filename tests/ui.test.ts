import assert from 'node:assert/strict';
import test from 'node:test';
import { formatJoinDate } from '../src/ui.js';

test('formats Join Date consistently', () => {
  assert.equal(
    formatJoinDate(new Date('2026-07-23T23:59:00.000Z')),
    '23 July 2026',
  );
});
