export function getFirstParagraph(value: string) {
  const firstParagraphRegex = /^.*\n/;
  const matches = value.match(firstParagraphRegex);

  return (matches ?? [''])[0];
}
