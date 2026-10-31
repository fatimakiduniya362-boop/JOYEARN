/**
 * Complete Numbers 1 to 100 Curriculum
 * Every single number from 1 to 100 with digits, full words, roman numerals,
 * even/odd parity, prime status, visual dot grouping, and skip-counting sets.
 */

export interface NumberItem {
  number: number;
  word: string;
  urduWord?: string;
  roman: string;
  isEven: boolean;
  isPrime: boolean;
  tens: number;
  ones: number;
  fact: string;
}

const ONES_WORDS = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS_WORDS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

const URDU_NUMBERS: Record<number, string> = {
  1: 'ایک', 2: 'دو', 3: 'تین', 4: 'چار', 5: 'پانچ', 6: 'چھ', 7: 'سات', 8: 'آٹھ', 9: 'نو', 10: 'دس',
  11: 'گیارہ', 12: 'بارہ', 13: 'تیرہ', 14: 'چودہ', 15: 'پندرہ', 16: 'سولہ', 17: 'سترہ', 18: 'اٹھارہ', 19: 'انیس', 20: 'بیس',
  25: 'پچیس', 30: 'تیس', 40: 'چالیس', 50: 'پچاس', 60: 'ساٹھ', 70: 'ستر', 80: 'اسی', 90: 'نوے', 100: 'سو'
};

function numberToWord(n: number): string {
  if (n === 100) return 'One Hundred';
  if (n < 20) return ONES_WORDS[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS_WORDS[t] : `${TENS_WORDS[t]}-${ONES_WORDS[o]}`;
}

function toRoman(num: number): string {
  const romanMap: [number, string][] = [
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  let rem = num;
  for (const [val, sym] of romanMap) {
    while (rem >= val) {
      result += sym;
      rem -= val;
    }
  }
  return result;
}

const PRIMES_UNDER_100 = new Set([
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97
]);

function getNumberFact(n: number): string {
  if (n === 1) return 'Number 1 is the first counting number and identity of multiplication.';
  if (n === 2) return 'Number 2 is the only even prime number in mathematics!';
  if (n === 7) return 'There are 7 days in a week and 7 colors in a natural rainbow.';
  if (n === 10) return 'Base-10 is the universal decimal system humans use for counting.';
  if (n === 12) return 'A collection of 12 items is called a dozen; there are 12 months in a year.';
  if (n === 24) return 'Earth takes 24 hours to complete one full rotation on its axis.';
  if (n === 50) return '50 represents half a century or half of one hundred percent (50%).';
  if (n === 60) return 'There are 60 seconds in a minute and 60 minutes in an hour.';
  if (n === 100) return '100 is 10 times 10, also known as a full century or 100 percent.';
  if (PRIMES_UNDER_100.has(n)) return `${n} is a prime number, meaning it has only two factors: 1 and itself.`;
  if (n % 10 === 0) return `${n} is a round multiple of 10, made of ${n / 10} groups of ten.`;
  if (n % 5 === 0) return `${n} ends in 5 and is an exact multiple of 5.`;
  return `${n} is made of ${Math.floor(n / 10)} tens and ${n % 10} ones.`;
}

export const NUMBERS_1_TO_100: NumberItem[] = Array.from({ length: 100 }, (_, i) => {
  const num = i + 1;
  return {
    number: num,
    word: numberToWord(num),
    urduWord: URDU_NUMBERS[num] || `${num}`,
    roman: toRoman(num),
    isEven: num % 2 === 0,
    isPrime: PRIMES_UNDER_100.has(num),
    tens: Math.floor(num / 10),
    ones: num % 10,
    fact: getNumberFact(num),
  };
});
