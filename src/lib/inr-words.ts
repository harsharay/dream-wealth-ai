/** Convert a non-negative INR amount to Indian-system words (e.g. "Two crore rupees"). */

const ones = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigit(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

function threeDigit(n: number): string {
  if (n < 100) return twoDigit(n);
  return ones[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + twoDigit(n % 100) : "");
}

export function toWordsINR(n: number): string {
  if (!n || n <= 0) return "";
  let rem = Math.floor(n);
  const parts: string[] = [];
  const crore = Math.floor(rem / 10_000_000);
  rem %= 10_000_000;
  const lakh = Math.floor(rem / 100_000);
  rem %= 100_000;
  const thousand = Math.floor(rem / 1_000);
  rem %= 1_000;
  if (crore) parts.push(twoDigit(crore) + " crore");
  if (lakh) parts.push(twoDigit(lakh) + " lakh");
  if (thousand) parts.push(twoDigit(thousand) + " thousand");
  if (rem) parts.push(threeDigit(rem));
  const words = parts.join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1) + " rupees";
}
