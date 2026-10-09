/**
 * Converts any text — including Unicode mathematical/styled characters,
 * emoji, and special symbols — into a clean URL slug.
 *
 * Examples:
 *   "𝐍𝐀𝐓𝐈𝐎𝐍𝐀𝐋 𝐈𝐓 𝐂𝐎𝐌𝐏𝐄𝐓𝐈𝐓𝐈𝐎𝐍 𝟐𝟎𝟐𝟔" → "national-it-competition-2026"
 *   "📣 [Free Workshop] 2026 📣"           → "free-workshop-2026"
 *   "𝗪𝗲𝗯𝗶𝗻𝗮𝗿 Cloud Native"                → "webinar-cloud-native"
 */

// Unicode math/styled character ranges → ASCII base codepoint
const UNICODE_RANGES: Array<[number, number, number]> = [
  // Math Bold A-Z / a-z
  [0x1D400, 0x1D419, 65], [0x1D41A, 0x1D433, 97],
  // Math Italic A-Z / a-z
  [0x1D434, 0x1D44D, 65], [0x1D44E, 0x1D467, 97],
  // Math Bold Italic A-Z / a-z
  [0x1D468, 0x1D481, 65], [0x1D482, 0x1D49B, 97],
  // Math Script A-Z / a-z
  [0x1D49C, 0x1D4B5, 65], [0x1D4B6, 0x1D4CF, 97],
  // Math Bold Script A-Z / a-z
  [0x1D4D0, 0x1D4E9, 65], [0x1D4EA, 0x1D503, 97],
  // Math Fraktur A-Z / a-z
  [0x1D504, 0x1D51C, 65], [0x1D51E, 0x1D537, 97],
  // Math Double-Struck A-Z / a-z
  [0x1D538, 0x1D550, 65], [0x1D552, 0x1D56B, 97],
  // Math Bold Fraktur A-Z / a-z
  [0x1D56C, 0x1D585, 65], [0x1D586, 0x1D59F, 97],
  // Math Sans-Serif A-Z / a-z
  [0x1D5A0, 0x1D5B9, 65], [0x1D5BA, 0x1D5D3, 97],
  // Math Sans-Serif Bold A-Z / a-z
  [0x1D5D4, 0x1D5ED, 65], [0x1D5EE, 0x1D607, 97],
  // Math Sans-Serif Italic A-Z / a-z
  [0x1D608, 0x1D621, 65], [0x1D622, 0x1D63B, 97],
  // Math Sans-Serif Bold Italic A-Z / a-z
  [0x1D63C, 0x1D655, 65], [0x1D656, 0x1D66F, 97],
  // Math Monospace A-Z / a-z
  [0x1D670, 0x1D689, 65], [0x1D68A, 0x1D6A3, 97],
  // Math Bold Digits 0-9 (multiple styles)
  [0x1D7CE, 0x1D7D7, 48], [0x1D7D8, 0x1D7E1, 48],
  [0x1D7E2, 0x1D7EB, 48], [0x1D7EC, 0x1D7F5, 48],
  [0x1D7F6, 0x1D7FF, 48],
];

function unicodeToAscii(str: string): string {
  return [...str].map(char => {
    const cp = char.codePointAt(0) ?? 0;
    for (const [start, end, base] of UNICODE_RANGES) {
      if (cp >= start && cp <= end) return String.fromCharCode(base + (cp - start));
    }
    return char;
  }).join('');
}

export function slugify(text: string): string {
  return unicodeToAscii(text)
    .toLowerCase()
    // Remove remaining non-ASCII (emoji, symbols, etc.)
    .replace(/[^\x00-\x7F]/g, '')
    // Replace sequences of non-alphanumeric chars with a single dash
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse multiple dashes (defensive, shouldn't be needed after above)
    .replace(/-{2,}/g, '-')
    // Strip leading/trailing dashes
    .replace(/(^-|-$)/g, '')
    .trim();
}
