import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ValidationError,
  validateRegistrationForm,
} from '../src/validation.js';

test('normalizes registration input', () => {
  assert.deepEqual(
    validateRegistrationForm(
      '  Kainan   Smith  ',
      'Kainan_23',
      '  High   School ',
    ),
    {
      name: 'Kainan Smith',
      robloxUsername: 'Kainan_23',
      gang: 'High School',
    },
  );
});

test('rejects invalid Roblox usernames', () => {
  assert.throws(
    () => validateRegistrationForm('Kainan', '@everyone', '-'),
    ValidationError,
  );
});

test('removes control characters from user input', () => {
  const result = validateRegistrationForm(
    'Kai\u0000nan',
    'Kainan23',
    'Gang\u0007Name',
  );
  assert.equal(result.name, 'Kainan');
  assert.equal(result.gang, 'GangName');
});
