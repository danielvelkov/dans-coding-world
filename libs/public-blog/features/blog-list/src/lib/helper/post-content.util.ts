export function getFirstParagraph(value: string) {
  const firstParagraphRegex = /^.*\n/;
  const matches = value.match(firstParagraphRegex);

  return (matches ?? [''])[0];
}

export function formatDateTo_DD_MMM_YYYY(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
