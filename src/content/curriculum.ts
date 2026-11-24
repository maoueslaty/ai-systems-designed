import type { Chapter, Lesson } from './types';
import { ch00 } from './lessons/ch00';
import { ch01 } from './lessons/ch01';
import { ch02 } from './lessons/ch02';
import { ch03 } from './lessons/ch03';
import { ch04 } from './lessons/ch04';
import { ch05 } from './lessons/ch05';
import { ch06 } from './lessons/ch06';
import { ch07 } from './lessons/ch07';
import { ch08 } from './lessons/ch08';
import { ch09 } from './lessons/ch09';
import { ch10 } from './lessons/ch10';
import { ch11 } from './lessons/ch11';
import { ch12 } from './lessons/ch12';
import { ch13 } from './lessons/ch13';
import { ch14 } from './lessons/ch14';
import { ch15 } from './lessons/ch15';
import { patternsTraffic } from './lessons/pat_traffic';
import { patternsKnowledge } from './lessons/pat_knowledge';
import { patternsAgents } from './lessons/pat_agents';
import { patternsTrust } from './lessons/pat_trust';
import { patternsServing } from './lessons/pat_serving';
import { STORY } from './story';
import { EXTRAS } from './extras';
import { EXTRAS_V3 } from './extras_v3';

const RAW: Chapter[] = [ch00, ch01, ch02, ch03, ch04, ch05, ch06, ch07, ch08, ch09, ch10, ch11, ch12, ch13, ch14, patternsTraffic, patternsKnowledge, patternsAgents, patternsTrust, patternsServing, ch15];

// merge the story layer and practice extras into the plain lesson data
export const CHAPTERS: Chapter[] = RAW.filter(c => c.lessons.length > 0).map(c => ({
  ...c,
  story: c.story ?? STORY[c.id],
  lessons: c.lessons.map(l => ({ ...(EXTRAS[l.id] ?? {}), ...(EXTRAS_V3[l.id] ?? {}), ...l })),
}));

export const hasPractice = (l: Lesson) => !!(l.quiz?.length || l.scenario || l.playground);

export const ALL_LESSONS: Lesson[] = CHAPTERS.flatMap(c => c.lessons);

export function findLesson(id: string): { chapter: Chapter; lesson: Lesson } | undefined {
  for (const chapter of CHAPTERS) {
    const lesson = chapter.lessons.find(l => l.id === id);
    if (lesson) return { chapter, lesson };
  }
}
