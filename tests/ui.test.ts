import assert from 'node:assert/strict';
import test from 'node:test';
import type { Registration } from '@prisma/client';
import { dashboardPayload, formatJoinDate } from '../src/ui.js';

test('formats Join Date consistently', () => {
  assert.equal(
    formatJoinDate(new Date('2026-07-23T23:59:00.000Z')),
    '23 July 2026',
  );
});

test('enables skip only while an applicant is being interviewed', () => {
  const registration: Registration = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    guildId: '12345678901234567',
    discordUserId: '12345678901234567',
    discordUsername: 'applicant',
    name: 'Kainan Smith',
    robloxUsername: 'KainanSmith',
    gang: '-',
    joinedAt: new Date('2026-07-23T23:59:00.000Z'),
    status: 'interviewing',
    dashboardMessageId: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date('2026-07-23T23:59:00.000Z'),
    updatedAt: new Date('2026-07-23T23:59:00.000Z'),
  };

  const interviewingButtons = dashboardPayload(registration)
    .components[0].components;
  assert.equal(interviewingButtons[0]?.data.disabled, true);
  assert.equal(interviewingButtons[1]?.data.disabled, false);

  const pendingButtons = dashboardPayload({
    ...registration,
    status: 'pending',
  }).components[0].components;
  assert.equal(pendingButtons[0]?.data.disabled, false);
  assert.equal(pendingButtons[1]?.data.disabled, true);
});
