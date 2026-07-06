#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const META = {
  name: 'wld-design',
  displayName: 'WLD Design',
  version: PACKAGE.version,
  description: '微粒贷设计工具箱',
  author: { name: 'anguszhu' },
  homepage: 'https://wld-design-plugin.netlify.app',
  repository: 'local-bundle',
  license: 'MIT',
};

const SKILLS = [
  {
    name: 'brainstorm',
    summary: 'Clarify a WLD UI idea, generate three options, run simplify/detail checks, then continue with feedback, Figma, Mini Program, or battle branches.',
  },
  {
    name: 'prototype',
    summary: 'Build high-fidelity WLD WeChat Mini Program demos from approved Figma or brainstorm designs.',
  },
  {
    name: 'push-to-figma',
    summary: 'Push approved WLD brainstorm designs into editable Figma frames with local MCP and WLD components.',
  },
  {
    name: 'simplify',
    summary: 'Strip clutter while preserving WLD product correctness and compliance-critical content.',
  },
  {
    name: 'find-missing-states',
    summary: 'Compare redesign frames against bundled state_machine specs and common pitfalls.',
  },
  {
    name: 'fix-details',
    summary: 'Catch detail bugs in a WLD screen or flow: wrong loan numbers, copy errors, and values that contradict each other within or across screens.',
  },
  {
    name: 'beyblade-battle',
    summary: 'Turn 2–7 Figma screens into spinning beyblades that battle in a local arena until one screen is left.',
  },
];

const PROVIDERS = {
  claude: {
    label: 'Claude',
    root: '.claude-plugin',
    pluginRootRef: '<claude-package-root>',
  },
  codex: {
    label: 'Codex',
    root: 'plugins/wld-design/.codex-plugin',
    pluginRootRef: '<agents-package-root>',
  },
  cursor: {
    label: 'Cursor',
    root: 'plugins/wld-design/.cursor-plugin',
    pluginRootRef: '<cursor-package-root>',
  },
  opencode: {
    label: 'opencode',
    root: '.opencode',
    pluginRootRef: '<opencode-package-root>',
  },
};

const GENERATED_ROOTS = [
  '.claude-plugin',
  '.codex-plugin',
  '.cursor-plugin',
  'plugins/wld-design/plugin.json',
  'plugins/wld-design/.codex-plugin',
  'plugins/wld-design/.cursor-plugin',
  '.opencode',
  '.agents',
  'rules',
  'plugin',
  'dist',
];

function abs(...parts) {
  return path.join(ROOT, ...parts);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function removeGeneratedDir(relativePath) {
  const target = abs(relativePath);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(ROOT) || resolved === ROOT) {
    throw new Error(`Refusing to remove unsafe path: ${relativePath}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
}

function claudeManifest() {
  return {
    '$schema': 'https://json.schemastore.org/claude-code-plugin-manifest.json',
    name: META.name,
    displayName: META.displayName,
    version: META.version,
    description: META.description,
    author: META.author,
    homepage: META.homepage,
    repository: META.repository,
    license: META.license,
    skills: SKILLS.map((skill) => `./plugins/wld-design/skills/${skill.name}`),
  };
}

function claudeMarketplace() {
  return {
    '$schema': 'https://anthropic.com/claude-code/marketplace.schema.json',
    name: META.name,
    metadata: {
      description: 'Toolkit for WLD (WeBank Weilidai) mobile interface design.',
    },
    owner: META.author,
    plugins: [
      {
        name: META.name,
        source: './',
        version: META.version,
        category: 'design',
      },
    ],
  };
}

function codexManifest({ skillsPath }) {
  return {
    name: META.name,
    version: META.version,
    description: META.description,
    author: META.author,
    homepage: META.homepage,
    repository: META.repository,
    license: META.license,
    keywords: ['wld', 'webank', 'design', 'figma', 'wechat', 'miniprogram', 'product-knowledge'],
    skills: skillsPath,
    interface: {
      displayName: META.displayName,
      shortDescription: 'WLD design, Figma handoff, Mini Program demos, and state coverage checks.',
      longDescription: META.description,
      developerName: META.author.name,
      category: 'Design',
      capabilities: ['Interactive', 'Write', 'Design', 'Analysis'],
      websiteURL: META.homepage,
      defaultPrompt: [
        'Brainstorm a WLD mobile screen from a product idea.',
        'Push an approved WLD brainstorm design into a Figma page.',
        'Build a WLD WeChat Mini Program demo from an approved Figma flow.',
        'Check which WLD redesign states are missing.',
      ],
      brandColor: '#FFD143',
    },
  };
}

function codexMarketplace() {
  return {
    name: META.name,
    interface: {
      displayName: META.displayName,
    },
    plugins: [
      {
        name: META.name,
        source: {
          source: 'local',
          path: './plugins/wld-design',
        },
        policy: {
          installation: 'AVAILABLE',
          authentication: 'ON_INSTALL',
        },
        category: 'Design',
      },
    ],
  };
}

function cursorManifest() {
  return {
    name: META.name,
    displayName: META.displayName,
    version: META.version,
    description: META.description,
    author: {
      name: META.author.name,
    },
    license: META.license,
    keywords: ['wld', 'webank', 'design', 'figma', 'wechat', 'miniprogram', 'product-knowledge'],
    logo: 'assets/icons/logo-webank.svg',
  };
}

function cursorMarketplace() {
  return {
    name: 'wld-design-marketplace',
    owner: {
      name: META.author.name,
    },
    metadata: {
      description: 'Marketplace for WLD Design plugin',
      version: META.version,
    },
    plugins: [
      {
        name: 'wld-design',
        source: './plugins/wld-design',
        description: META.description,
      },
    ],
  };
}

function providerGuide(providerName) {
  const provider = PROVIDERS[providerName];
  const skillsList = SKILLS.map((skill) => `- \`${META.name}:${skill.name}\` - ${skill.summary}`).join('\n');

  return `# ${META.displayName} (${provider.label})

This generated package adapts the canonical WLD Design skills for ${provider.label}. The source of truth lives in the repository root under \`plugins/wld-design/skills/\` and \`plugins/wld-design/assets/\`.

## How to Use

When the user asks for WLD mobile UI work, match the request to one of these workflows and read that skill file before acting:

${skillsList}

Resolve any \`${provider.pluginRootRef}\` references to this package root. Read only the skill and shared files needed for the current task.

## Shared Sources

- \`plugins/wld-design/assets/DESIGN.md\` - WLD visual system summary.
- \`plugins/wld-design/assets/mockup-chrome.css\` and \`plugins/wld-design/assets/snippets/\` - presentation-only WeChat preview chrome.
- \`plugins/wld-design/assets/screens/\` - production-accurate HTML screen templates.
- \`plugins/wld-design/assets/pm-memory-cache/\` - bundled product patterns and pitfalls.
- \`plugins/wld-design/assets/pm-spec-cache/\` - bundled state_machine specs.
- \`plugins/wld-design/assets/product-memory.md\` - screen to COMP_ID bridge and injection format.
- \`plugins/wld-design/assets/figma-mcp.md\` - provider-neutral instructions for discovering and using Figma MCP tools.

## Safety

- Treat bundled cache files under \`plugins/wld-design/assets/pm-*-cache/\` as read-only snapshots unless intentionally preparing a refreshed local package.
- If Figma MCP is unavailable for a Figma-dependent workflow, clearly degrade or stop as the skill instructs.
`;
}

function writeOpencodeInstructions() {
  fs.writeFileSync(abs(PROVIDERS.opencode.root, 'INSTRUCTIONS.md'), providerGuide('opencode'));
}

function writeOpencodeConfig() {
  writeJson(abs(PROVIDERS.opencode.root, 'opencode.json'), {
    '$schema': 'https://opencode.ai/config.json',
    instructions: ['INSTRUCTIONS.md', 'plugins/wld-design/assets/DESIGN.md', 'plugins/wld-design/assets/product-memory.md'],
  });
}

function main() {
  for (const dir of GENERATED_ROOTS) {
    removeGeneratedDir(dir);
  }

  for (const provider of Object.values(PROVIDERS)) {
    ensureDir(abs(provider.root));
  }

  writeJson(abs('.claude-plugin', 'plugin.json'), claudeManifest());
  writeJson(abs('.claude-plugin', 'marketplace.json'), claudeMarketplace());
  writeJson(abs('plugins/wld-design', 'plugin.json'), codexManifest({ skillsPath: './skills/' }));
  writeJson(abs('plugins/wld-design/.codex-plugin', 'plugin.json'), codexManifest({ skillsPath: '../skills/' }));
  writeJson(abs('plugins/wld-design/.cursor-plugin', 'plugin.json'), cursorManifest());
  writeJson(abs('.cursor-plugin', 'marketplace.json'), cursorMarketplace());
  writeJson(abs('.agents', 'plugins', 'marketplace.json'), codexMarketplace());

  writeOpencodeInstructions();
  writeOpencodeConfig();

  console.log(`Built provider packages: ${Object.values(PROVIDERS).map((provider) => provider.root).join(', ')}`);
}

main();
