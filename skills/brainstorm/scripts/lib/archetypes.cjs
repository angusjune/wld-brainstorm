'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const DIVERSITY_MODES = ['ux', 'visual', 'mixed'];

function readCatalogFile(file, label) {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not readable JSON: ${error.message}`);
  }
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`${label} must use schemaVersion ${SCHEMA_VERSION}`);
  }
  if (!Array.isArray(payload.archetypes)) {
    throw new Error(`${label} must declare an archetypes array`);
  }
  return payload;
}

function assertArchetype(entry, axes, label) {
  const where = `${label} archetype ${entry && entry.id ? entry.id : '(missing id)'}`;
  if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
    throw new Error(`${where} must declare a kebab-case id`);
  }
  if (typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`${where} must declare a name`);
  if (!['ux', 'visual'].includes(entry.mode)) throw new Error(`${where} mode must be ux or visual`);
  if (!entry.axes || typeof entry.axes !== 'object') throw new Error(`${where} must declare axes`);
  for (const axis of Object.keys(axes)) {
    const value = entry.axes[axis];
    if (typeof value !== 'string') throw new Error(`${where} must declare axis ${axis}`);
    if (value === 'inherit') {
      if (entry.mode !== 'visual') throw new Error(`${where} may only inherit ${axis} in visual mode`);
      continue;
    }
    if (!axes[axis].includes(value)) {
      throw new Error(`${where} axis ${axis} value ${value} is not in the declared vocabulary`);
    }
  }
  if (typeof entry.intent !== 'string' || !entry.intent.trim()) throw new Error(`${where} must declare an intent`);
  if (!Array.isArray(entry.moves) || entry.moves.length === 0) throw new Error(`${where} must declare at least one move`);
}

/**
 * Loads the shared catalog and merges an optional profile extension over it.
 * Profile entries win on id collision so a fork can retune a shared archetype
 * without editing shared machinery.
 */
function loadArchetypes({ skillDir, profileDir }) {
  const sharedFile = path.join(skillDir, 'references', 'archetypes.json');
  if (!fs.existsSync(sharedFile)) throw new Error(`shared archetype catalog is missing: ${sharedFile}`);
  const shared = readCatalogFile(sharedFile, 'shared archetype catalog');
  const axes = shared.axes;
  if (!axes || typeof axes !== 'object') throw new Error('shared archetype catalog must declare axes');

  const merged = new Map();
  const sources = [sharedFile];
  for (const entry of shared.archetypes) {
    assertArchetype(entry, axes, 'shared archetype catalog');
    merged.set(entry.id, { ...entry, source: 'shared' });
  }

  const profileFile = profileDir ? path.join(profileDir, 'quality', 'archetypes.json') : null;
  if (profileFile && fs.existsSync(profileFile)) {
    const profile = readCatalogFile(profileFile, 'profile archetype catalog');
    if (profile.axes) {
      throw new Error('profile archetype catalog must not redeclare axes; the shared catalog owns the vocabulary');
    }
    for (const entry of profile.archetypes) {
      assertArchetype(entry, axes, 'profile archetype catalog');
      merged.set(entry.id, { ...entry, source: 'profile' });
    }
    sources.push(profileFile);
  }

  return {
    axes,
    rules: shared.rules || {},
    archetypes: [...merged.values()],
    sources,
  };
}

function byId(catalog, id) {
  const found = catalog.archetypes.find((entry) => entry.id === id);
  if (!found) throw new Error(`unknown archetype: ${id}`);
  return found;
}

/**
 * The rule the corpus measurement produced: `focus` must differ for every pair,
 * while `commitment` needs only two distinct values across the set. Applies to
 * ux-mode members only; visual archetypes inherit both axes and are exempt.
 */
function validateArchetypeSet(set) {
  const findings = [];
  const ids = set.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    findings.push({ code: 'archetype-repeated', message: `an archetype is assigned more than once: ${ids.join(', ')}` });
  }
  const ux = set.filter((entry) => entry.mode === 'ux');
  if (ux.length > 1) {
    const focus = ux.map((entry) => entry.axes.focus);
    if (new Set(focus).size !== focus.length) {
      findings.push({
        code: 'archetype-focus-collision',
        message: `ux archetypes must each take a distinct focus; found ${focus.join(', ')}`,
      });
    }
    const commitment = ux.map((entry) => entry.axes.commitment);
    const required = Math.min(2, ux.length);
    if (new Set(commitment).size < required) {
      findings.push({
        code: 'archetype-commitment-collision',
        message: `ux archetypes need at least ${required} distinct commitment values; found ${[...new Set(commitment)].join(', ')}`,
      });
    }
  }
  return { status: findings.length === 0 ? 'passed' : 'blocked', findings };
}

/**
 * True when an archetype describes the screen the rework already starts from.
 * Assigning it spends an option slot on a direction the user can already see,
 * so default assignment skips it. Visual archetypes inherit their axes and can
 * never match a concrete baseline.
 */
function matchesBaseline(entry, baselineAxes) {
  if (!baselineAxes || entry.mode !== 'ux') return false;
  const axes = Object.keys(baselineAxes);
  if (axes.length === 0) return false;
  return axes.every((axis) => entry.axes[axis] === baselineAxes[axis]);
}

function modeQuota(diversityMode, count) {
  if (diversityMode === 'ux') return { ux: count, visual: 0 };
  if (diversityMode === 'visual') return { ux: 0, visual: count };
  const visual = count >= 3 ? 1 : 0;
  return { ux: count - visual, visual };
}

function firstValidCombination(pool, size) {
  const chosen = [];
  const walk = (start) => {
    if (chosen.length === size) return validateArchetypeSet(chosen).status === 'passed';
    for (let index = start; index < pool.length; index += 1) {
      chosen.push(pool[index]);
      if (validateArchetypeSet(chosen).status === 'passed' && walk(index + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  return walk(0) ? [...chosen] : null;
}

/**
 * Resolves the archetype set for a stage. An explicit `requested` list is
 * honoured and validated; otherwise a deterministic default is picked in
 * catalog order so a run is reproducible.
 */
function assignArchetypes({
  catalog, count, diversityMode = 'mixed', requested = [], baselineAxes = null,
}) {
  if (!DIVERSITY_MODES.includes(diversityMode)) {
    throw new Error(`--diversity-mode must be one of ${DIVERSITY_MODES.join(', ')}`);
  }
  if (!Number.isInteger(count) || count < 1) throw new Error('archetype assignment requires a positive screen count');

  if (requested.length > 0) {
    if (requested.length !== count) {
      throw new Error(`expected ${count} --archetype values to match the screen count; received ${requested.length}`);
    }
    const set = requested.map((id) => byId(catalog, id));
    const report = validateArchetypeSet(set);
    if (report.status !== 'passed') {
      throw new Error(`archetype set is invalid: ${report.findings.map((finding) => finding.message).join('; ')}`);
    }
    return {
      archetypes: set,
      diversityMode,
      assignment: 'explicit',
      baselineAxes,
      baselineOverrides: set.filter((entry) => matchesBaseline(entry, baselineAxes)).map((entry) => entry.id),
    };
  }

  const quota = modeQuota(diversityMode, count);
  const excluded = catalog.archetypes.filter((entry) => matchesBaseline(entry, baselineAxes));
  const uxPool = catalog.archetypes
    .filter((entry) => entry.mode === 'ux')
    .filter((entry) => !matchesBaseline(entry, baselineAxes));
  const visualPool = catalog.archetypes.filter((entry) => entry.mode === 'visual');
  if (uxPool.length < quota.ux) {
    throw new Error(`catalog has ${uxPool.length} ux archetypes after excluding the baseline; ${quota.ux} needed`);
  }
  if (visualPool.length < quota.visual) throw new Error(`catalog has ${visualPool.length} visual archetypes; ${quota.visual} needed`);

  const ux = quota.ux > 0 ? firstValidCombination(uxPool, quota.ux) : [];
  if (!ux) throw new Error(`no ${quota.ux} ux archetypes in the catalog satisfy the diversity rule`);
  const set = [...ux, ...visualPool.slice(0, quota.visual)];
  const report = validateArchetypeSet(set);
  if (report.status !== 'passed') {
    throw new Error(`default archetype assignment is invalid: ${report.findings.map((finding) => finding.message).join('; ')}`);
  }
  return {
    archetypes: set,
    diversityMode,
    assignment: 'default',
    baselineAxes,
    baselineExcluded: excluded.map((entry) => entry.id),
  };
}

function archetypeBriefLines(assignment) {
  const lines = [
    '',
    `## Solution archetypes (diversity mode: \`${assignment.diversityMode}\`)`,
    '',
    'One archetype is assigned to each option below. The assignment already satisfies the diversity rule — every ux archetype takes a distinct `focus`, and the set carries at least two distinct `commitment` values. Do not swap, merge, or reinterpret the assignment; author each option to its own archetype.',
    '',
  ];
  for (const [index, entry] of assignment.archetypes.entries()) {
    lines.push(
      `### Option ${index + 1} — ${entry.name} (\`${entry.id}\`)`,
      '',
      `- Mode: \`${entry.mode}\``,
      `- focus: \`${entry.axes.focus}\` · commitment: \`${entry.axes.commitment}\``,
      `- Intent: ${entry.intent}`,
      '- Moves:',
    );
    for (const move of entry.moves) lines.push(`  - ${move}`);
    if (entry.avoid) lines.push(`- Avoid: ${entry.avoid}`);
    lines.push('');
  }
  lines.push(
    'A profile principle that says it may be broken with a strong reason may be broken to serve an archetype; name that reason in the option\'s caption. A profile law stating no such allowance, and any contract-enforced identity anchor, outranks an archetype\'s `avoid`. An identity anchor is satisfied by keeping the class present at its source count — its colour, size and shape are yours to change.',
    '',
    'Record the archetype you followed in each caption as an `archetype` field holding the id exactly as written above. A caption whose archetype does not match its assigned option is a validation failure.',
    '',
    'An archetype whose axes read `inherit` is a visual archetype: hold the baseline structure and vary treatment only.',
    '',
  );
  return lines;
}

module.exports = {
  SCHEMA_VERSION,
  DIVERSITY_MODES,
  archetypeBriefLines,
  assignArchetypes,
  loadArchetypes,
  matchesBaseline,
  validateArchetypeSet,
};
