export function getFirstParagraph(value: string) {
  const firstParagraphRegex = /^.(?=\n|$)|.{0,300}/;
  const matches = value.match(firstParagraphRegex);

  return (matches ?? [''])[0].trim();
}

export function formatDateTo_DD_MMM_YYYY(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
