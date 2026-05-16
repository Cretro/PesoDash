/**
 * Frankfurter Currency Exchange API
 * https://api.frankfurter.dev/v1/latest?from=PHP&to=USD,EUR,JPY,KRW,SGD
 * No API key required. Backed by the European Central Bank.
 */

export const CURRENCIES = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "KRW", flag: "🇰🇷", name: "Korean Won" },
  { code: "SGD", flag: "🇸🇬", name: "Singapore Dollar" },
];

export async function fetchExchangeRates() {
  const codes = CURRENCIES.map((c) => c.code).join(",");
  const res = await fetch(
    `https://api.frankfurter.dev/v1/latest?from=PHP&to=${codes}`,
    { cache: "no-cache" }
  );
  if (!res.ok) throw new Error("Currency fetch failed");
  const data = await res.json();
  // data.rates gives "how many X per 1 PHP"
  // We want "how many PHP per 1 X" → invert
  const inverted = {};
  for (const [code, rate] of Object.entries(data.rates)) {
    inverted[code] = (1 / rate).toFixed(2);
  }
  return { date: data.date, rates: inverted };
}
