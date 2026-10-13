export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, action: () => void, className = 'button button-secondary'): HTMLButtonElement {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function pageShell(content: HTMLElement, eyebrow?: string): HTMLElement {
  const shell = element('section', 'screen');
  if (eyebrow) shell.append(element('p', 'eyebrow', eyebrow));
  shell.append(content);
  return shell;
}

export function heading(title: string, subtitle?: string): HTMLElement {
  const group = element('div', 'heading-group');
  group.append(element('h1', 'screen-title', title));
  if (subtitle) group.append(element('p', 'screen-subtitle', subtitle));
  return group;
}

export function progressBar(index: number): HTMLElement {
  const group = element('div', 'progress-track');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', `Question ${index + 1} of 10`);
  for (let i = 0; i < 10; i++) {
    const segment = element('span', `progress-segment${i < index ? ' is-done' : ''}${i === index ? ' is-current' : ''}`);
    segment.setAttribute('aria-hidden', 'true');
    group.append(segment);
  }
  return group;
}
