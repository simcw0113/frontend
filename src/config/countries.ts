// Static dial-code list for the phone field (no network). Flag emoji are built
// from the ISO code; `value` of an option is the ISO code because some dial
// codes are shared (US/CA).
export type Country = { iso: string; dial: string };

export const DEFAULT_COUNTRY = "MY";

export const countries: Country[] = [
  { iso: "MY", dial: "60" },
  { iso: "SG", dial: "65" },
  { iso: "CN", dial: "86" },
  { iso: "ID", dial: "62" },
  { iso: "TH", dial: "66" },
  { iso: "VN", dial: "84" },
  { iso: "PH", dial: "63" },
  { iso: "IN", dial: "91" },
  { iso: "JP", dial: "81" },
  { iso: "KR", dial: "82" },
  { iso: "HK", dial: "852" },
  { iso: "TW", dial: "886" },
  { iso: "MO", dial: "853" },
  { iso: "BD", dial: "880" },
  { iso: "PK", dial: "92" },
  { iso: "AE", dial: "971" },
  { iso: "TR", dial: "90" },
  { iso: "GB", dial: "44" },
  { iso: "DE", dial: "49" },
  { iso: "FR", dial: "33" },
  { iso: "ES", dial: "34" },
  { iso: "IT", dial: "39" },
  { iso: "US", dial: "1" },
  { iso: "CA", dial: "1" },
  { iso: "BR", dial: "55" },
  { iso: "MX", dial: "52" },
  { iso: "AU", dial: "61" },
  { iso: "NZ", dial: "64" },
  { iso: "ZA", dial: "27" },
  { iso: "NG", dial: "234" },
];

export function flagEmoji(iso: string) {
  return String.fromCodePoint(...[...iso].map((char) => 127397 + char.charCodeAt(0)));
}
