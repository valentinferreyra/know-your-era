export function fixtureBundle(): any {
  return {
    version: 'fixture-v1',
    events: [{ id: 'event-one', name: 'Synthetic event', date: '2000-01-01', mainBroadcast: true, uk: false }],
    sources: [{ id: 'source-one', url: 'https://example.com/results', title: 'Synthetic results', inspectedAt: '2026-10-13', locator: 'Fixture only' }],
    facts: [{ id: 'fact-one', eventId: 'event-one', statement: 'Fixture fact', date: '2000-01-01', sourceIds: ['source-one'], reviewStatus: 'reviewed' }],
    assets: [],
    questions: [{
      id: 'question-one', familyId: 'family-one', conflictGroups: ['fact-one'],
      category: 'main-event', difficulty: 'easy', kind: 'choice',
      prompt: 'Which fictional participant?', explanation: 'Fixture explanation.',
      eventIds: ['event-one'], factIds: ['fact-one'], sourceIds: ['source-one'],
      reviewStatus: 'reviewed', reviewedAt: '2026-10-13', ukOnly: false,
      options: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', label: 'Gamma' }, { id: 'd', label: 'Delta' }],
      answer: 'a'
    }]
  };
}
