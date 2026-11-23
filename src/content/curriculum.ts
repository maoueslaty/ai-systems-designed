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

export const CHAPTERS: Chapter[] = [ch00, ch01, ch02, ch03, ch04, ch05, ch06, ch07, ch08, ch09, ch10, ch11, ch12, ch13, ch14];

export const ALL_LESSONS: Lesson[] = CHAPTERS.flatMap(c => c.lessons);

export function findLesson(id: string): { chapter: Chapter; lesson: Lesson } | undefined {
  for (const chapter of CHAPTERS) {
    const lesson = chapter.lessons.find(l => l.id === id);
    if (lesson) return { chapter, lesson };
  }
}
