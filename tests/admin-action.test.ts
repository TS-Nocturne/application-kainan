import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAdminAction } from '../src/admin-action.js';

test('parses valid admin component IDs', () => {
  assert.deepEqual(
    parseAdminAction(
      'registration:approve:550e8400-e29b-41d4-a716-446655440000',
    ),
    {
      action: 'approve',
      registrationId: '550e8400-e29b-41d4-a716-446655440000',
    },
  );
});

test('rejects malformed component IDs', () => {
  assert.equal(parseAdminAction('registration:approve:not-a-uuid'), null);
  assert.equal(
    parseAdminAction(
      'registration:delete:550e8400-e29b-41d4-a716-446655440000',
    ),
    null,
  );
});
