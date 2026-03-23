const AVERAGE_READING_WPM = 200;

export function getReadingTime(
  content: string,
  readingWPM: number = AVERAGE_READING_WPM
) {
  const numOfWords = content.match(/\w+/gm)?.length ?? 0;
  const minutes = Math.ceil(numOfWords / readingWPM);
  if (minutes <= 1) return 'Less than a minute';
  else return `${minutes} minutes`;
}
