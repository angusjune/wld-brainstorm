#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { acknowledgeAnnotations } = require('./lib/annotations.cjs');

const [stateDir, file, through] = process.argv.slice(2);

if (!stateDir || !file || !through) {
  console.error('用法: node scripts/acknowledge-annotations.cjs <stateDir> <file> <through-id>');
  process.exit(2);
}

let sessionId = '';
try {
  const serverInfo = JSON.parse(fs.readFileSync(path.join(stateDir, 'server-info.json'), 'utf8'));
  sessionId = serverInfo.sessionId || '';
} catch (error) {
  console.error(`读取会话信息失败: ${error.message}`);
  process.exit(1);
}

try {
  const result = acknowledgeAnnotations(
    stateDir,
    { file, through },
    { sessionId, atMs: Date.now() },
  );
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
