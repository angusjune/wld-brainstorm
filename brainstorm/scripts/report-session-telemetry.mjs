#!/usr/bin/env node

/**
 * Summarise one brainstorm session's performance telemetry.
 *
 * Usage:
 *   node scripts/report-session-telemetry.mjs [--json] <session-dir|state-dir|session-events.jsonl>
 */

import fs from 'node:fs';
import path from 'node:path';
import telemetry from './lib/session-telemetry.cjs';

const { EVENT_FILE, EVENTS } = telemetry;

function resolveEventPath(target) {
  const absolute = path.resolve(target);
  if (!fs.existsSync(absolute)) throw new Error(`路径不存在: ${target}`);
  if (fs.statSync(absolute).isFile()) return absolute;
  const direct = path.join(absolute, EVENT_FILE);
  if (fs.existsSync(direct)) return direct;
  const nested = path.join(absolute, 'state', EVENT_FILE);
  if (fs.existsSync(nested)) return nested;
  throw new Error(`找不到 ${EVENT_FILE}: ${target}`);
}

function readEvents(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); } catch {
        throw new Error(`${path.basename(file)} 第 ${index + 1} 行不是有效 JSON`);
      }
    });
}

function first(events, predicate) {
  return events.find(predicate) || null;
}

function difference(later, earlier) {
  if (!later || !earlier) return null;
  return Math.max(0, later.elapsedMs - earlier.elapsedMs);
}

function summarise(events) {
  const started = first(events, (event) => event.event === EVENTS.SESSION_STARTED);
  const listening = first(events, (event) => event.event === EVENTS.SERVER_LISTENING);
  const writes = events.filter((event) => event.event === EVENTS.SCREEN_WRITTEN && event.file === 'solutions.html');
  const firstWrite = writes[0] || null;
  const serves = events.filter((event) => event.event === EVENTS.SCREEN_SERVED && event.file === 'solutions.html');
  const firstServe = serves[0] || null;
  const qaRuns = events.filter((event) => event.event === EVENTS.QA_COMPLETED && event.files?.includes('solutions.html'));
  const firstQaPass = first(qaRuns, (event) => event.passed === true);
  const firstServeAfterQa = firstQaPass
    ? first(serves, (event) => event.elapsedMs >= firstQaPass.elapsedMs)
    : null;
  const latestWrite = writes.at(-1) || null;

  return {
    sessionId: started?.sessionId || events[0]?.sessionId || null,
    eventCount: events.length,
    serverReadyMs: listening?.elapsedMs ?? null,
    solutions: {
      firstWriteMs: firstWrite?.elapsedMs ?? null,
      prepareAndGenerateMs: difference(firstWrite, listening),
      firstServeMs: firstServe?.elapsedMs ?? null,
      firstQaPassMs: firstQaPass?.elapsedMs ?? null,
      qaAfterFirstWriteMs: difference(firstQaPass, firstWrite),
      firstServeAfterQaMs: firstServeAfterQa?.elapsedMs ?? null,
      serveAfterQaMs: difference(firstServeAfterQa, firstQaPass),
      writes: writes.length,
      revisions: latestWrite?.revision ?? 0,
      finalBytes: latestWrite?.bytes ?? null,
      serves: serves.length,
      qaRuns: qaRuns.length,
      qaFailures: qaRuns.filter((event) => !event.passed).length,
    },
  };
}

function duration(value) {
  if (value === null) return '—';
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const targets = argv.filter((arg) => arg !== '--json');

if (targets.length !== 1) {
  console.error('用法: node scripts/report-session-telemetry.mjs [--json] <session-dir|state-dir|session-events.jsonl>');
  process.exit(2);
}

try {
  const eventPath = resolveEventPath(targets[0]);
  const summary = summarise(readEvents(eventPath));
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`会话: ${summary.sessionId || '未知'}`);
    console.log(`服务启动: ${duration(summary.serverReadyMs)}`);
    console.log(`准备并生成首版 solutions: ${duration(summary.solutions.prepareAndGenerateMs)}`);
    console.log(`首版写入到首次自动 QA gate 通过: ${duration(summary.solutions.qaAfterFirstWriteMs)}`);
    console.log(`自动 QA gate 通过到首次页面读取: ${duration(summary.solutions.serveAfterQaMs)}`);
    console.log(`solutions 写入 ${summary.solutions.writes} 次，QA ${summary.solutions.qaRuns} 次（失败 ${summary.solutions.qaFailures} 次），最终 ${summary.solutions.finalBytes ?? '—'} bytes`);
  }
} catch (error) {
  console.error(`session report: ${error.message}`);
  process.exit(1);
}
