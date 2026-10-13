import type { ClientQuestion } from '../content/types.ts';
import events from '../../content/events.json';
import assets from '../content/generated/assets.json';

export interface Artwork { path: string; alt: string; type: 'portrait' | 'belt' | 'logo' | 'photo' }
export const portraits = [
  ['Steve Austin|Stone Cold', 'stone_cold', 'Steve Austin'],
  ['The Rock', 'the_rock', 'The Rock'],
  ['Triple H', 'triple_h', 'Triple H'],
  ['Shawn Michaels', 'shawn_michaels', 'Shawn Michaels'],
  ['Undertaker', 'the_undertaker', 'The Undertaker'],
  ['Kane', 'kane', 'Kane'],
  ['Mick Foley|Mankind', 'mick_foley', 'Mick Foley'],
  ['Chris Jericho', 'chris_jericho', 'Chris Jericho'],
  ['Kurt Angle', 'kurt_angle', 'Kurt Angle'],
  ['Eddie Guerrero', 'eddie_guerrero', 'Eddie Guerrero'],
  ['John Cena', 'john_cena', 'John Cena'],
  ['Randy Orton', 'randy_orton', 'Randy Orton'],
  ['Brock Lesnar', 'brock_lesnar', 'Brock Lesnar'],
  ['Big Show', 'big_show', 'Big Show'],
  ['Ric Flair', 'ric_flair', 'Ric Flair'],
  ['Trish Stratus', 'trish_stratus', 'Trish Stratus'],
  ['Lita', 'lita', 'Lita'],
  ['Dudley Boyz', 'dudley_boyz', 'The Dudley Boyz'],
  ['Rikishi', 'rikishi', 'Rikishi'],
  ['Crash Holly', 'crash', 'Crash Holly'],
  ['Hardcore Holly|Bob Holly', 'hardcore_holly', 'Hardcore Holly'],
  ['Tazz|Taz', 'tazz', 'Tazz']
] as const;

export function portraitIn(text: string): Artwork | undefined {
  const row = portraits.find(([names]) => names.split('|').some(name =>
    new RegExp(`(?:^|[^a-z])${name}(?:$|[^a-z])`, 'i').test(text)));
  return row ? { path: `/assets/${row[1]}.webp`, alt: row[2], type: 'portrait' } : undefined;
}

export function beltIn(text: string): Artwork | undefined {
  const belts = [
    ['World Heavyweight', 'world_heavyweight_title'], ['Intercontinental', 'intercontinental_title'],
    ['United States', 'us_title'], ['Cruiserweight', 'cruiserweight_title'],
    ["Women", 'womens_title'], ['Tag Team', 'tag_team_title'], ['WWE Championship', 'wwf_championship']
  ];
  const row = belts.find(([name]) => text.includes(name!));
  return row ? { path: `/assets/${row[1]}.webp`, alt: `${row[0]} Championship`, type: 'belt' } : undefined;
}

export function eventFor(question: ClientQuestion) {
  if (question.eventIds.length !== 1) return undefined;
  return events.find(event => event.id === question.eventIds[0]);
}

export function eventLogo(question: ClientQuestion): Artwork | undefined {
  const event = eventFor(question);
  if (!event) return undefined;
  const editions: Record<string, string> = {
    'wrestlemania-xiv-1998': 'wrestlemania_xiv.webp', 'wrestlemania-x8-2002': 'wrestlemania18_logo.webp',
    'wrestlemania-xix-2003': 'wrestlemania19_logo.webp', 'wrestlemania-xx-2004': 'wrestlemania_xx.webp'
  };
  const families = [
    ['SummerSlam', 'summerslam-logo.png'], ['Survivor Series', 'survivor-series-logo.png'],
    ['Royal Rumble', 'royal-rumble-logo.png'], ['Judgment Day', 'judgment-day-logo.png'],
    ['Bad Blood', 'bad-blood-logo.png'], ['No Way Out', 'nowayout_logo.webp'], ['No Mercy', 'no_mercy_logo.webp'],
    ['Backlash', 'backlash-logo.webp'], ['Vengeance', 'vengeance-logo.webp']
  ];
  const filename = editions[event.id] ?? families.find(([name]) => event.name.includes(name!))?.[1];
  return filename ? { path: `/assets/${filename}`, alt: event.name, type: 'logo' } : undefined;
}

export function questionArt(question: ClientQuestion): Artwork | undefined {
  // Only a wrestler already named in the prompt may be singled out before Confirm.
  return portraitIn(question.prompt) ?? beltIn(question.prompt);
}

export function answerArt(question: ClientQuestion): Artwork | undefined {
  const photo = assets.find(asset => asset.id === question.answerAssetId && asset.suitable);
  if (photo) return { path: photo.path, alt: photo.alt, type: 'photo' };
  const answer = question.kind === 'choice' ? question.options.find(option => option.id === question.answer)?.label ?? ''
    : question.kind === 'matching' ? [...question.left, ...question.right].map(item => item.label).join(' ')
    : question.explanation;
  return portraitIn(answer) ?? beltIn(question.prompt);
}

export function artImage(art: Artwork, className: string): HTMLImageElement {
  const image = document.createElement('img');
  image.className = `${className} art-${art.type}`; image.src = art.path;
  image.alt = art.alt; image.decoding = 'async';
  image.addEventListener('load', () => {
    if (art.type === 'portrait' && image.naturalWidth > image.naturalHeight * 1.1) image.classList.add('art-wide');
  });
  image.addEventListener('error', () => {
    const parent = image.parentElement;
    if (art.type === 'logo') {
      const label = document.createElement('span'); label.className = 'event-name'; label.textContent = art.alt;
      image.replaceWith(label); return;
    }
    image.remove();
    if (parent?.matches('.question-arena, .feedback-art')) {
      parent.parentElement?.classList.remove('has-art'); parent.remove();
    }
  });
  return image;
}
