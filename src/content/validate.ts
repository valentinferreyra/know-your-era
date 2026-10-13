import { categories, difficulties } from './types.ts';
import type { ContentBundle } from './types.ts';

type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

export function validateBundle(bundle: ContentBundle, requireReleaseCounts: boolean): string[] {
  const errors: string[] = [];
  const fail = (label: string, message: string) => errors.push(`${label}: ${message}`);
  if (!object(bundle)) return ['bundle must be an object'];
  if (!text(bundle.version)) fail('bundle', 'missing version');
  const rows = (value: unknown, label: string): Row[] => {
    if (!Array.isArray(value)) { fail(label, 'must be an array'); return []; }
    return value.filter((entry, i) => {
      if (!object(entry)) { fail(`${label}[${i}]`, 'must be an object'); return false; }
      return true;
    });
  };
  const strings = (value: unknown, label: string, nonempty = true): string[] => {
    if (!Array.isArray(value) || !value.every(text)) { fail(label, 'must contain nonempty strings'); return []; }
    if (nonempty && !value.length) fail(label, 'must not be empty');
    if (new Set(value).size !== value.length) fail(label, 'duplicate values');
    return value;
  };
  const index = (value: unknown, label: string) => {
    const map = new Map<string, Row>();
    for (const row of rows(value, label)) {
      if (!text(row.id)) { fail(label, 'missing id'); continue; }
      if (map.has(row.id)) fail(label, `duplicate ${label} id ${row.id}`);
      map.set(row.id, row);
    }
    return map;
  };
  const events = index(bundle.events, 'event');
  const sources = index(bundle.sources, 'source');
  const facts = index(bundle.facts, 'fact');
  const assets = index(bundle.assets, 'asset');
  const questions = index(bundle.questions, 'question');
  const known = (ids: string[], map: Map<string, Row>, label: string, entity: string) => {
    for (const id of ids) if (!map.has(id)) fail(label, `unknown ${entity} ${id}`);
  };

  for (const [id, e] of events) {
    if (!validDate(e.date) || e.date < '1998-03-29' || e.date > '2004-07-11') fail(id, 'event outside scope');
    if (e.mainBroadcast !== true) fail(id, 'requires main broadcast scope');
    if (typeof e.uk !== 'boolean' || !text(e.name)) fail(id, 'invalid event identity');
  }
  for (const [id, s] of sources) {
    if (!text(s.url) || !/^https?:\/\//.test(s.url) || !text(s.title) || !text(s.locator) || !validDate(s.inspectedAt))
      fail(id, 'source requires inspected URL and supporting passage locator');
  }
  for (const [id, f] of facts) {
    if (!text(f.eventId) || !events.has(f.eventId)) fail(id, 'unknown event');
    if (!text(f.statement) || !validDate(f.date)) fail(id, 'invalid historical fact');
    if (events.get(String(f.eventId))?.date !== f.date) fail(id, 'fact date differs from broadcast date');
    if (f.reviewStatus !== 'reviewed') fail(id, 'fact is not reviewed');
    const supporting = strings(f.sourceIds, `${id} supporting source`);
    known(supporting, sources, id, 'supporting source');
    if (f.sequence !== undefined && (!Number.isInteger(f.sequence) || Number(f.sequence) < 1)) fail(id, 'invalid sequence position');
    if (f.champion !== undefined && (!text(f.champion) || !text(f.championship)
      || !validDate(f.reignStart) || !validDate(f.reignEnd) || !validDate(f.date)
      || f.reignStart >= f.date || f.reignEnd < f.date)) fail(id, 'requires a verified holder before the match');
  }
  for (const [id, a] of assets) {
    if (!text(a.path) || !a.path.startsWith('/assets/') || a.path.includes('..')) fail(id, 'invalid asset path');
    if (!text(a.alt) || !text(a.origin) || !Number.isFinite(a.width) || !Number.isFinite(a.height)
      || Number(a.width) < 1 || Number(a.height) < 1) fail(id, 'invalid asset metadata');
    if (!['photo', 'logo', 'belt', 'background'].includes(String(a.type)) || a.suitable !== true) fail(id, 'unreviewed asset suitability');
    if (!['unknown', 'licensed', 'owned'].includes(String(a.permissionStatus))) fail(id, 'missing permission status');
    for (const field of ['visibleEventIds', 'overrideEventIds'] as const) {
      if (a[field] !== undefined) known(strings(a[field], `${id} ${field}`, false), events, id, 'event');
    }
  }

  const families = new Set<string>();
  const permitted: Record<string, string[]> = {
    'main-event': ['choice', 'completion'], 'champion-entering': ['choice', 'completion'],
    'order-history': ['ordering'], 'odd-one-out': ['choice'], 'rebuild-card': ['matching']
  };
  for (const [id, q] of questions) {
    if (!categories.includes(q.category as any) || !difficulties.includes(q.difficulty as any)) fail(id, 'invalid category or difficulty');
    if (!permitted[String(q.category)]?.includes(String(q.kind))) fail(id, 'invalid category and interaction combination');
    if (!text(q.familyId) || families.has(q.familyId)) fail(id, 'duplicate or missing independent family');
    families.add(String(q.familyId));
    if (!text(q.prompt) || !text(q.explanation)) fail(id, 'missing prompt or explanation');
    if (/\bWWF\b/i.test(`${q.prompt} ${q.explanation} ${q.prefix ?? ''} ${q.suffix ?? ''}`)) fail(id, 'WWF prose is not permitted in UI');
    strings(q.conflictGroups, `${id} conflict groups`);
    const eventIds = strings(q.eventIds, `${id} events`);
    const factIds = strings(q.factIds, `${id} facts`);
    known(eventIds, events, id, 'event'); known(factIds, facts, id, 'fact');
    const questionSources = strings(q.sourceIds, `${id} supporting source`);
    known(questionSources, sources, id, 'supporting source');
    if (q.reviewStatus !== 'reviewed' || !validDate(q.reviewedAt)) fail(id, 'question requires completed editorial review');
    for (const factId of factIds) {
      const fact = facts.get(factId);
      if (!eventIds.includes(String(fact?.eventId))) fail(id, 'fact belongs to another event');
      if (fact && Array.isArray(fact.sourceIds) && !fact.sourceIds.some(s => questionSources.includes(String(s))))
        fail(id, 'fact evidence is not cited');
    }
    const hasUK = eventIds.some(e => events.get(e)?.uk === true);
    if (q.ukOnly !== hasUK || (hasUK && q.difficulty !== 'hard')) fail(id, 'UK scope requires a hard gated question');
    for (const role of ['promptAssetId', 'answerAssetId', 'logoAssetId']) {
      if (q[role] === undefined) continue;
      const asset = assets.get(String(q[role]));
      if (!asset) { fail(id, `unknown asset ${q[role]}`); continue; }
      if (role === 'promptAssetId' && asset.promptSafe !== true) fail(id, 'prompt asset can reveal the answer');
      const overrides: string[] = Array.isArray(asset.overrideEventIds)
        ? asset.overrideEventIds.filter((eventId): eventId is string => typeof eventId === 'string') : [];
      if (asset.visibleYear !== undefined && eventIds.some(e => Number(String(events.get(e)?.date).slice(0, 4)) !== asset.visibleYear && !overrides.includes(e)))
        fail(id, 'contradictory asset year or edition');
      const visibleEventIds: string[] = Array.isArray(asset.visibleEventIds)
        ? asset.visibleEventIds.filter((eventId): eventId is string => typeof eventId === 'string') : [];
      if (visibleEventIds.length && eventIds.some(e => !visibleEventIds.includes(e) && !overrides.includes(e))) fail(id, 'contradictory asset edition');
    }
    const itemRows = (value: unknown, label: string): Row[] => {
      const entries = rows(value, `${id} ${label}`);
      const ids = entries.map(e => e.id), labels = entries.map(e => text(e.label) ? normalize(e.label) : '');
      if (!ids.every(text) || new Set(ids).size !== ids.length) fail(id, `invalid or duplicate ${label} id`);
      if (labels.includes('') || new Set(labels).size !== labels.length) fail(id, `duplicate ${label} label`);
      if (entries.some(e => /\bWWF\b/.test(String(e.label)))) fail(id, 'WWF prose is not permitted in UI');
      return entries;
    };
    if (q.kind === 'choice') {
      const options = itemRows(q.options, 'option');
      if (options.length !== 4) fail(id, 'choice requires four options');
      if (!options.some(o => o.id === q.answer)) fail(id, 'answer references unknown option');
    } else if (q.kind === 'completion') {
      if (typeof q.prefix !== 'string' || typeof q.suffix !== 'string' || !text(q.answer)) fail(id, 'invalid completion sentence');
      const aliases = strings(q.aliases, `${id} answer aliases`);
      if (aliases.some(a => !normalize(a))) fail(id, 'invalid answer alias');
    } else if (q.kind === 'matching') {
      const left = itemRows(q.left, 'left item'), right = itemRows(q.right, 'right item');
      const count = { easy: 2, medium: 3, hard: 4 }[q.difficulty as 'easy' | 'medium' | 'hard'];
      if (left.length !== count || right.length !== count) fail(id, `requires ${count} pairs`);
      const partners = object(q.answer) ? q.answer : {};
      if (!object(q.answer) || Object.keys(partners).length !== left.length
        || !left.every(e => right.some(r => r.id === partners[String(e.id)]))
        || new Set(Object.values(partners)).size !== right.length)
        fail(id, 'answer must provide one unambiguous partner per item');
    } else if (q.kind === 'ordering') {
      if (q.orderMode === 'show' && !String(q.prompt).includes('as they happened during the show')) fail(id, 'missing explicit within-show instruction');
      const entries = itemRows(q.items, 'ordering item');
      const answer = strings(q.answer, `${id} ordering answer`);
      const count = q.difficulty === 'hard' ? 4 : 3;
      if (entries.length !== count || answer.length !== count || !entries.every(e => answer.includes(String(e.id))))
        fail(id, 'ordering answer must include each item once');
      const keys = entries.map(e => {
        const f = facts.get(String(e.factId));
        if (!f || !factIds.includes(String(e.factId))) { fail(id, 'ordering item requires known supporting fact'); return ''; }
        if (q.orderMode === 'show') {
          if (!Number.isInteger(f.sequence)) fail(id, 'within-show ordering requires verified sequence');
          if (eventIds.length !== 1) fail(id, 'within-show ordering requires one event');
          return String(f.sequence).padStart(5, '0');
        }
        return String(f.date);
      });
      if (!['show', 'date'].includes(String(q.orderMode))) fail(id, 'invalid ordering mode');
      if (new Set(keys).size !== keys.length) fail(id, 'tied chronology');
      const correct = entries.map((e, i) => ({ id: e.id, key: keys[i] })).sort((a, b) => a.key.localeCompare(b.key)).map(e => e.id);
      if (JSON.stringify(correct) !== JSON.stringify(answer)) fail(id, 'answer differs from verified chronology');
    }
  }
  if (requireReleaseCounts) {
    if (questions.size !== 300) fail('release', 'requires exactly 300 questions');
    for (const category of categories) for (const difficulty of difficulties) {
      const pool = [...questions.values()].filter(q => q.category === category && q.difficulty === difficulty);
      if (pool.length !== 20) fail('release', `${category}/${difficulty} requires twenty questions`);
      if (['main-event', 'champion-entering'].includes(category))
        for (const kind of ['choice', 'completion']) if (!pool.some(q => q.kind === kind)) fail('release', `${category}/${difficulty} missing ${kind}`);
    }
  }
  return errors;
}
