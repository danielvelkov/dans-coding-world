export function getExcerpt(value: string) {
  const firstParagraphRegex = /.{0,300}/;
  const matches = value.trim().match(firstParagraphRegex);

  return (matches ?? [''])[0];
}
