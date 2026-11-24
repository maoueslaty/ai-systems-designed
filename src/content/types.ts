// ─────────────────────────────────────────────────────────────
// Content model — every lesson is plain data rendered by the engine
// ─────────────────────────────────────────────────────────────

export type Vec = [number, number];

export type Tone =
  | 'cyan' | 'violet' | 'amber' | 'green' | 'red' | 'pink'
  | 'teal' | 'blue' | 'slate' | 'ink' | 'llm' | 'paper';

export type NodeKind =
  | 'cube'   // service / process
  | 'slab'   // flat platform
  | 'cyl'    // datastore
  | 'crowd'  // users
  | 'aws'    // official AWS icon on a pedestal
  | 'doc'    // documents / files
  | 'chip'   // small flat label on the ground (token, chunk)
  | 'gpu';   // accelerator board

export type Glyph =
  | 'server' | 'db' | 'user' | 'users' | 'brain' | 'spark' | 'doc' | 'search'
  | 'tool' | 'plug' | 'lock' | 'shield' | 'chart' | 'eye' | 'gear' | 'route'
  | 'layers' | 'cpu' | 'memory' | 'check' | 'x' | 'clock' | 'code' | 'globe'
  | 'key' | 'mail' | 'flag' | 'scale' | 'split' | 'loop' | 'hash' | 'vector'
  | 'grid' | 'bolt' | 'box' | 'filter' | 'terminal' | 'bot' | 'link' | 'cache' | 'sun' | 'moon';

export interface SNode {
  id: string;
  at: Vec;
  z?: number;
  kind?: NodeKind;
  label?: string | string[];
  sub?: string;          // small caption under the label
  tone?: Tone;
  glyph?: Glyph;
  aws?: string;          // file name in /public/aws without .svg
  w?: number; d?: number; h?: number;
  state?: 'ok' | 'down' | 'hot' | 'dim' | 'warn';
  badge?: string;        // small corner badge (e.g. "×3")
  pin?: { text: string; tone?: Tone; icon?: Glyph };  // status label pinned above the node ("API down", "attempt 4")
}

export interface SEdge {
  id: string;
  from: string;
  to: string;
  via?: Vec[];
  label?: string;
  dashed?: boolean;
  tone?: Tone;
  both?: boolean;        // arrowheads both ends
  faint?: boolean;
  labelAt?: number;     // 0..1 position of the label along the edge
}

export type PKind =
  | 'req' | 'res' | 'token' | 'vec' | 'msg' | 'tool' | 'fail' | 'ctx' | 'attack' | 'trace';

export interface SFlow {
  on: string;            // edge id
  kind: PKind;
  rate: number;          // particles per second
  speed?: number;        // multiplier
  reverse?: boolean;
  text?: string[];       // particles carry these labels (cycled)
  dropAt?: number;       // 0..1 → particle bursts at that fraction (failures)
}

export interface SZone {
  id: string;
  from: Vec;
  to: Vec;
  label?: string;
  tone?: Tone;
  solid?: boolean;
}

export interface SChip {
  id: string;
  at: Vec;
  z?: number;
  text: string;
  tone?: Tone;
  icon?: Glyph;
  lead?: number;          // z of the anchor point: draws a leader line down to it (used by node pins)
}

// HTML overlays placed in % of the stage
export type Widget =
  | { type: 'tokens'; id: string; x: number; y: number; w?: number; title?: string;
      items: { t: string; id?: number | string; tone?: Tone; dim?: boolean }[] }
  | { type: 'matrix'; id: string; x: number; y: number; w?: number; title?: string;
      rows: string[]; cols: string[]; values: (number | null)[][]; tone?: Tone; focusRow?: number; fmt?: 'pct' | 'num' }
  | { type: 'scatter'; id: string; x: number; y: number; w?: number; h?: number; title?: string;
      points: { x: number; y: number; label: string; tone?: Tone; hi?: boolean }[];
      query?: { x: number; y: number; label: string; r?: number }; links?: [number, number][] }
  | { type: 'bars'; id: string; x: number; y: number; w?: number; title?: string; unit?: string;
      items: { label: string; value: number; tone?: Tone; hi?: boolean }[]; max?: number }
  | { type: 'code'; id: string; x: number; y: number; w?: number; title?: string; lang?: string; lines: string[] }
  | { type: 'kv'; id: string; x: number; y: number; w?: number; title?: string; rows: [string, string, Tone?][] }
  | { type: 'stack'; id: string; x: number; y: number; w?: number; title?: string;
      items: { label: string; size: number; tone?: Tone; hi?: boolean; note?: string }[]; cap?: number; capLabel?: string };

export interface Scene {
  nodes: SNode[];
  edges?: SEdge[];
  flows?: SFlow[];
  zones?: SZone[];
  chips?: SChip[];
  widgets?: Widget[];
}

export type StepTag = 'setup' | 'problem' | 'solution' | 'technique' | 'tradeoff' | 'insight' | 'recap' | 'aws' | 'fde';

export interface Step {
  short: string;
  tag: StepTag;
  title: string;
  body: string[];                       // light HTML: <b> <em> <code> <span class="term">
  callout?: { kind: 'tip' | 'warn' | 'fact' | 'aws' | 'fde'; title?: string; text: string };
  changes?: { sign: '+' | '-' | '~'; text: string }[];
  metrics?: Record<string, string | number>;
  scene: Scene;
  /** failure-injection toggle: the same step with something broken */
  inject?: { label: string; scene: Scene; metrics?: Record<string, string | number>; note: string };
  /** side-by-side comparison rendered instead of `scene` (scene is still used for transitions) */
  compare?: { left: { label: string; scene: Scene }; right: { label: string; scene: Scene } };
}

export interface MetricDef { id: string; label: string; icon?: Glyph; good?: 'low' | 'high' }

export interface Notes {
  key: string[];          // core ideas
  practices: string[];    // best practices
  pitfalls: string[];     // edge cases & failure modes
  fde?: string[];         // field / customer-facing notes
  refs?: { t: string; u: string }[];
}

export interface DecisionRecord {
  context: string;
  options: { name: string; verdict: string }[];
  decision: string;
  consequences: string[];
  cto: string;                // what I'd tell the CTO, in one or two sentences
}

export interface QuizQ { q: string; options: string[]; answer: number; why: string }

export interface Scenario {
  title: string;
  situation: string;
  options: { text: string; outcome: string; grade: 'best' | 'ok' | 'poor' }[];
}

export type PlaygroundId = 'cost' | 'token-tax' | 'sampling' | 'kv' | 'reliability' | 'budget' | 'claims-cost';

export type PatternFamily = 'traffic' | 'knowledge' | 'output' | 'tools' | 'orchestration' | 'trust' | 'serving' | 'quality' | 'modality';

export interface PatternCard {
  family: PatternFamily;
  problem: string;      // one line: the pain
  solution: string;     // one line: the mechanism
  failure: string;      // the new failure mode the pattern introduces
  whenNot: string;      // when not to use it
  aws: string[];        // AWS building blocks
  oss: string[];        // open-source equivalents
  related?: string[];   // other lesson ids
}

export interface LessonExtras { senior?: DecisionRecord; quiz?: QuizQ[]; scenario?: Scenario; playground?: PlaygroundId; pattern?: PatternCard }

export interface Lesson extends LessonExtras {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  metrics?: MetricDef[];
  legend?: PKind[];
  goals?: { text: string; step: number }[];
  steps?: Step[];         // present ⇒ animated lesson
  notes: Notes;
}

export interface ChapterStory {
  act: 0 | 1 | 2 | 3 | 4 | 5;  // 0 prologue, 4 pattern catalog, 5 epilogue (case study)
  why: string;                 // why this chapter matters, in plain words
  cost: string;                // the unit-economics lens: how it moves cost, latency or quality
  carry: string;               // what to carry into the next chapter
}

export interface Chapter {
  id: string;
  num: string;
  title: string;
  tone: Tone;
  blurb: string;
  lessons: Lesson[];
  story?: ChapterStory;
}

/** design-interview mode: a prompt, then a sequence of decisions with graded options */
export interface Interview {
  id: string;
  title: string;
  prompt: string;
  constraints: string[];
  rounds: { q: string; options: { text: string; grade: 'best' | 'ok' | 'poor'; why: string }[] }[];
  lessons: string[];      // lessons that teach the model answer
}
