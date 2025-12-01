export function generateRandomString(length: number) {
  const LETTERS_IN_ALPHABET = 26;
  const lowercaseLetters = Array.from({ length: LETTERS_IN_ALPHABET }, (_, i) =>
    String.fromCharCode('a'.charCodeAt(0) + i)
  );
  const text = [];
  for (let i = length; i > 0; i--)
    text.push(
      lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)]
    );
  return text.join('');
}
