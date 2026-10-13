export const categories = ['main-event', 'order-history', 'champion-entering', 'odd-one-out', 'rebuild-card'] as const;
export const difficulties = ['easy', 'medium', 'hard'] as const;
export type Category = typeof categories[number];
export type Difficulty = typeof difficulties[number];
export type QuestionKind = 'choice' | 'completion' | 'ordering' | 'matching';
export type ReviewStatus = 'draft' | 'reviewed';
export interface EventRecord { id: string; name: string; date: string; mainBroadcast: boolean; uk: boolean; brand?: string }
export interface SourceRecord { id: string; url: string; title: string; inspectedAt: string; locator: string }
export interface FactRecord {
  id: string; eventId: string; statement: string; date: string; sourceIds: string[];
  reviewStatus: ReviewStatus; sequence?: number; participants?: string[]; mainEvent?: boolean;
  champion?: string; championship?: string; reignStart?: string; reignEnd?: string;
}
export interface AssetRecord {
  id: string; path: string; type: 'photo' | 'logo' | 'belt' | 'background'; width: number; height: number;
  alt: string; origin: string; permissionStatus: 'unknown' | 'licensed' | 'owned';
  eventFamily?: string; visibleYear?: number; visibleEdition?: string; suitable: boolean; promptSafe: boolean;
}
export interface Item { id: string; label: string }
export interface QuestionFields {
  id: string; familyId: string; conflictGroups: string[]; category: Category; difficulty: Difficulty;
  prompt: string; explanation: string; eventIds: string[]; ukOnly: boolean;
  promptAssetId?: string; answerAssetId?: string; logoAssetId?: string;
}
export type QuestionPayload =
  | { kind: 'choice'; options: Item[]; answer: string }
  | { kind: 'completion'; prefix: string; suffix: string; answer: string; aliases: string[] }
  | { kind: 'ordering'; items: (Item & { factId: string })[]; answer: string[]; orderMode: 'date' | 'show' }
  | { kind: 'matching'; left: Item[]; right: Item[]; answer: Record<string, string> };
export type EditorialQuestion = QuestionFields & QuestionPayload & {
  factIds: string[]; sourceIds: string[]; reviewStatus: ReviewStatus; reviewedAt?: string;
};
export type ClientQuestion = QuestionFields & (
  Exclude<QuestionPayload, { kind: 'ordering' }>
  | { kind: 'ordering'; items: Item[]; answer: string[]; orderMode: 'date' | 'show' }
);
export interface ContentBundle {
  version: string; events: EventRecord[]; sources: SourceRecord[];
  facts: FactRecord[]; assets: AssetRecord[]; questions: EditorialQuestion[];
}
export interface ClientContent { version: string; questions: ClientQuestion[] }
