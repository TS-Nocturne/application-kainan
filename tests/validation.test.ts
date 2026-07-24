import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ValidationError,
  validateRegistrationForm,
} from '../src/validation.js';

test('normalizes registration input', () => {
  assert.deepEqual(
    validateRegistrationForm(
      '  Kai   Discord  ',
      '  Kainan   Smith  ',
      'Kainan_23',
      '  High   School ',
    ),
    {
      serverNickname: 'Kai Discord',
      name: 'Kainan Smith',
      robloxUsername: 'Kainan_23',
      gang: 'High School',
    },
  );
});

test('rejects invalid Roblox usernames', () => {
  assert.throws(
    () => validateRegistrationForm('Kai', 'Kainan', '@everyone', '-'),
    ValidationError,
  );
});

test('removes control characters from user input', () => {
  const result = validateRegistrationForm(
    'Kai\u0000 Discord',
    'Kai\u0000nan',
    'Kainan23',
    'Gang\u0007Name',
  );
  assert.equal(result.serverNickname, 'Kai Discord');
  assert.equal(result.name, 'Kainan');
  assert.equal(result.gang, 'GangName');
});

test('rejects invalid Discord server nicknames', () => {
  assert.throws(
    () => validateRegistrationForm(' '.repeat(3), 'Kainan', 'Kainan23', '-'),
    ValidationError,
  );
  assert.throws(
    () => validateRegistrationForm('x'.repeat(33), 'Kainan', 'Kainan23', '-'),
    ValidationError,
  );
});
