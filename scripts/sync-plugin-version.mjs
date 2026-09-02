#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(repoDir, 'package.json');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const pluginName = packageJson.name;

const versionField = /("version"\s*:\s*")[^"]+(")/;

/** Reads the top-level `version` of a manifest. */
function readManifestVersion(manifest) {
  return manifest.version;
}

/** Rewrites the first `version` field, which is the top-level one in these manifests. */
function writeManifestVersion(text, version) {
  return text.replace(versionField, `$1${version}$2`);
}

/** Finds the marketplace entry describing this plugin. */
function findMarketplaceEntry(marketplace) {
  return (marketplace.plugins ?? []).find((plugin) => plugin.name === pluginName);
}

function readMarketplaceVersion(marketplace) {
  return findMarketplaceEntry(marketplace)?.version;
}

/** Rewrites the `version` inside this plugin's marketplace entry only. */
function writeMarketplaceVersion(text, version) {
  const entryPattern = new RegExp(`\\{[^{}]*"name"\\s*:\\s*"${pluginName}"[^{}]*\\}`);
  const entryText = text.match(entryPattern)?.[0];
  if (entryText === undefined) {
    return text;
  }
  return text.replace(entryText, entryText.replace(versionField, `$1${version}$2`));
}

const targets = [
  {
    relativePath: path.join('.codex-plugin', 'plugin.json'),
    read: readManifestVersion,
    write: writeManifestVersion,
  },
  {
    relativePath: path.join('.claude-plugin', 'plugin.json'),
    read: readManifestVersion,
    write: writeManifestVersion,
  },
  {
    relativePath: path.join('.claude-plugin', 'marketplace.json'),
    read: readMarketplaceVersion,
    write: writeMarketplaceVersion,
  },
];

const checkOnly = process.argv.includes('--check');

for (const target of targets) {
  const targetPath = path.join(repoDir, target.relativePath);
  const text = fs.readFileSync(targetPath, 'utf8');
  const currentVersion = target.read(JSON.parse(text));

  if (currentVersion === undefined) {
    throw new Error(`Could not locate the version field in ${target.relativePath}.`);
  }
  if (currentVersion === packageJson.version) {
    continue;
  }

  if (checkOnly) {
    console.error(
      `Version mismatch: package.json is ${packageJson.version}, but ${target.relativePath} is ${currentVersion}.`,
    );
    process.exitCode = 1;
    continue;
  }

  const updatedText = target.write(text, packageJson.version);
  if (updatedText === text) {
    throw new Error(`Could not rewrite the version field in ${target.relativePath}.`);
  }
  fs.writeFileSync(targetPath, updatedText);
  console.log(`Synchronized ${target.relativePath} to ${packageJson.version}.`);
}
