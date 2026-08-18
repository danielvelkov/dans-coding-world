import { convert } from 'html-to-text';
import DOMPurify from 'dompurify';

export function getExcerpt(html: string, length = 300) {
  const clean = DOMPurify.sanitize(html);

  const text = convert(clean, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });

  const normalized = text.replace(/\n{3,}/g, '\n\n').trim();

  return normalized.length <= length
    ? normalized
    : normalized.slice(0, length).trim() + '…';
}
