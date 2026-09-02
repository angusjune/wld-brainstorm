#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const BRAINSTORM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CALCULATOR = path.join(BRAINSTORM_DIR, 'profile/quality/tools/calc.mjs');
const INPUT = JSON.stringify({
  annualRate: 0.144,
  principal: 60000,
  term: 3,
  loanDate: '2026-06-08',
});

function runCalculator(input, timezone = 'UTC') {
  return spawnSync(process.execPath, [CALCULATOR, input], {
    cwd: BRAINSTORM_DIR,
    encoding: 'utf8',
    env: { ...process.env, TZ: timezone },
  });
}

test('date-only loan inputs produce identical schedules in every timezone', () => {
  const utc = runCalculator(INPUT, 'UTC');
  const shanghai = runCalculator(INPUT, 'Asia/Shanghai');

  assert.equal(utc.status, 0, utc.stderr);
  assert.equal(shanghai.status, 0, shanghai.stderr);
  assert.deepEqual(JSON.parse(shanghai.stdout), JSON.parse(utc.stdout));
  assert.deepEqual(
    JSON.parse(utc.stdout).schedule.map((payment) => payment.date),
    ['2026-07-08', '2026-08-08', '2026-09-08'],
  );
});

test('unknown repayment types fail instead of producing a corrupt schedule', () => {
  const invalid = runCalculator(JSON.stringify({
    annualRate: 0.144,
    principal: 60000,
    term: 3,
    loanDate: '2026-06-08',
    repaymentType: 'EQUAL_INSTALLMENT',
  }));

  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /repaymentType|还款方式/);
});

test('help lists the actual supported repayment type values', () => {
  const help = spawnSync(process.execPath, [CALCULATOR, '--help'], {
    cwd: BRAINSTORM_DIR,
    encoding: 'utf8',
  });

  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /EQUAL_AMORTIZATION/);
  assert.match(help.stdout, /INTEREST_FIRST/);
  assert.match(help.stdout, /HYBRID_INTEREST_FIRST/);
  assert.match(help.stdout, /STAGED_RATE/);
  assert.doesNotMatch(help.stdout, /EQUAL_INSTALLMENT/);
});
