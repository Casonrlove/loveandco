import { normalizeBundleAddons, summarizeBundleAddons } from './catalog.js';

export const MONOGRAM_OPTIONS = [
  { value: '', label: 'None' },
  { value: '3-letter', label: '3-letter monogram' },
  { value: 'initials', label: 'Initials' },
  { value: 'first-name', label: 'First name only' },
  { value: 'other', label: 'Other monogram' },
];

export const COLOR_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'white', label: 'White' },
  { value: 'cream', label: 'Cream' },
  { value: 'black', label: 'Black' },
  { value: 'gray', label: 'Gray' },
  { value: 'dark-gray', label: 'Dark gray' },
  { value: 'taupe', label: 'Taupe' },
  { value: 'light-yellow', label: 'Light yellow' },
  { value: 'khaki', label: 'Khaki' },
  { value: 'dark-brown', label: 'Dark brown' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'gold', label: 'Gold' },
  { value: 'orange', label: 'Orange' },
  { value: 'dark-orange', label: 'Dark orange' },
  { value: 'red', label: 'Red' },
  { value: 'maroon', label: 'Maroon' },
  { value: 'light-pink', label: 'Light pink' },
  { value: 'pink', label: 'Pink' },
  { value: 'hot-pink', label: 'Hot pink' },
  { value: 'fuchsia', label: 'Fuchsia' },
  { value: 'purple', label: 'Purple' },
  { value: 'light-purple', label: 'Light purple' },
  { value: 'lilac', label: 'Lilac' },
  { value: 'light-blue', label: 'Light blue' },
  { value: 'royal-blue', label: 'Royal blue' },
  { value: 'navy-blue', label: 'Navy blue' },
  { value: 'turquoise', label: 'Turquoise' },
  { value: 'teal', label: 'Teal' },
  { value: 'mint', label: 'Mint' },
  { value: 'light-green', label: 'Light green' },
  { value: 'green', label: 'Green' },
  { value: 'dark-green', label: 'Dark green' },
  { value: 'match-item', label: 'Match thread color to item' },
];

export const NAME_SPELLING_NOTE = 'Please review the spelling. Love & Co. Embroidery will not be responsible for any spelling mistakes caused by the customer.';
export const MONOGRAM_ORDER_NOTE = 'It will be stitched in the traditional monogram format (First Last Middle).';
export const NAPKIN_EXTRA_COLOR_NOTE = 'One thread color is included. More than one color is an extra charge per napkin.';

export const NAPKIN_COLOR_OPTIONS = [
  { value: 'natural', label: 'Natural linen' },
  { value: 'white', label: 'White' },
];

export const BUNDLE_THEME_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'floral', label: 'Floral' },
  { value: 'cowgirl', label: 'Cowgirl' },
  { value: 'western', label: 'Western' },
  { value: 'airplane', label: 'Airplane' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'other', label: 'Other (tell me in the notes)' },
];

export const PLACEMENT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'center-chest', label: 'Center chest' },
  { value: 'left-chest', label: 'Left chest' },
  { value: 'pocket', label: 'Pocket' },
  { value: 'cuff', label: 'Cuff' },
  { value: 'collar', label: 'Collar' },
  { value: 'hem', label: 'Hem' },
  { value: 'corner', label: 'Corner' },
  { value: 'other', label: 'Other' },
];

export const NAME_WAIVER_LABEL = 'This spelling is correct';
export const NAME_WAIVER = 'I confirm this name and spelling are correct. Love & Co. Embroidery is not responsible for misspellings or name errors I approve.';

export function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value || 'None';
}

export function formatProofTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function letterOnly(value) {
  return String(value || '').replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase();
}

export function formatThreeLetterMonogram(item) {
  const first = letterOnly(item.monogramFirst);
  const middle = letterOnly(item.monogramMiddle);
  const last = letterOnly(item.monogramLast);
  if (!first && !middle && !last) return '';
  return [first, last, middle].filter(Boolean).join(' ');
}

export function requiresCustomization(item) {
  return item?.category === 'baby-bundles' || item?.slug === 'bachelorette-package' || item?.slug === 'wedding-cocktail-napkins' || item?.slug === 'monogram-towel';
}

export function hasDesignSelections(item) {
  return Boolean(
    String(item.designName || '').trim()
    || item.monogram
    || formatThreeLetterMonogram(item)
    || item.threadColor
    || item.placement
    || item.bundleTheme
    || item.napkinColor
    || letterOnly(item.towelLetter)
    || String(item.extraNotes || item.designDescription || '').trim()
  );
}

export function validateDesignItem(item) {
  const wantsDesign = Boolean(item.wantsDesign || item.isCustom || item.is_custom || requiresCustomization(item));
  if (!wantsDesign) return null;
  if (item?.category === 'baby-bundles' && !item.bundleTheme) {
    return 'Choose a theme for this baby bundle.';
  }
  if (item?.slug === 'monogram-towel') {
    if (!letterOnly(item.towelLetter)) return 'Choose 1 letter for the monogram towel.';
    if (!item.threadColor) return 'Choose a thread color.';
    return null;
  }
  if (item?.slug === 'wedding-cocktail-napkins') {
    if (!item.napkinColor) return 'Choose a napkin color.';
    if (!item.threadColor) return 'Choose a thread color.';
    if (!String(item.designName || '').trim()) return 'Tell me what to embroider on the napkin.';
  }
  const name = String(item.designName || '').trim();
  if (name && !item.nameVerified) {
    return 'Confirm the spelling on every item that includes a name.';
  }
  if (item.nameVerified && name && String(item.nameVerifiedValue || '').trim() !== name) {
    return 'Name confirmation no longer matches the name to stitch. Confirm the spelling again.';
  }
  if (item.monogram === '3-letter') {
    const first = letterOnly(item.monogramFirst);
    const middle = letterOnly(item.monogramMiddle);
    const last = letterOnly(item.monogramLast);
    if (!first || !middle || !last) {
      return 'Enter first, middle, and last initials for the 3-letter monogram.';
    }
  }
  if (!item.isCustom && !item.is_custom && !hasDesignSelections(item)) {
    return 'Choose design options or add notes for each piece with a custom design.';
  }
  return null;
}

export function buildDesignProof(item, { now = new Date().toISOString() } = {}) {
  const name = String(item.designName || '').trim();
  const verified = Boolean(item.nameVerified && name);
  const clientAt = item.nameVerifiedAt && !Number.isNaN(new Date(item.nameVerifiedAt).getTime())
    ? item.nameVerifiedAt
    : null;
  return {
    wantsDesign: Boolean(item.wantsDesign || item.isCustom || item.is_custom || requiresCustomization(item)),
    designName: name,
    bundleTheme: item.bundleTheme || '',
    bundleThemeLabel: optionLabel(BUNDLE_THEME_OPTIONS, item.bundleTheme),
    bundleAddons: item.category === 'baby-bundles' ? normalizeBundleAddons(item) : undefined,
    napkinColor: item.napkinColor || '',
    napkinColorLabel: optionLabel(NAPKIN_COLOR_OPTIONS, item.napkinColor),
    towelLetter: letterOnly(item.towelLetter),
    monogram: item.monogram || '',
    monogramLabel: optionLabel(MONOGRAM_OPTIONS, item.monogram),
    monogramFirst: letterOnly(item.monogramFirst),
    monogramMiddle: letterOnly(item.monogramMiddle),
    monogramLast: letterOnly(item.monogramLast),
    monogramStitched: item.monogram === '3-letter' ? formatThreeLetterMonogram(item) : '',
    threadColor: item.threadColor || '',
    threadColorLabel: optionLabel(COLOR_OPTIONS, item.threadColor),
    placement: item.placement || '',
    placementLabel: optionLabel(PLACEMENT_OPTIONS, item.placement),
    extraNotes: String(item.extraNotes || '').trim(),
    nameVerified: verified,
    nameVerifiedValue: verified ? (String(item.nameVerifiedValue || name).trim() || name) : '',
    nameVerifiedAtClient: verified ? clientAt : null,
    nameVerifiedAt: verified ? now : null,
    nameWaiverText: verified ? NAME_WAIVER : '',
    submittedAt: now,
  };
}

export function proofRows(details) {
  if (!details) return [];
  const rows = [];
  if (details.type) rows.push(['Project type', details.type]);
  if (details.item && typeof details.item === 'string') rows.push(['Item', details.item]);
  if (details.color) rows.push(['Color / material', details.color]);
  if (details.neededBy) rows.push(['Needed by', details.neededBy]);
  if (details.details) rows.push(['Project details', details.details]);
  if (details.personalization && details.personalization !== details.designName) {
    rows.push(['Shop notes', details.personalization]);
  }
  if (details.bundleTheme) rows.push(['Theme', details.bundleThemeLabel || optionLabel(BUNDLE_THEME_OPTIONS, details.bundleTheme)]);
  if (details.bundleAddons && summarizeBundleAddons({ category: 'baby-bundles', bundleAddons: details.bundleAddons })) {
    rows.push(['Add-ons', summarizeBundleAddons({ category: 'baby-bundles', bundleAddons: details.bundleAddons }).replaceAll('\n', '; ')]);
  }
  if (details.towelLetter) rows.push(['Letter', details.towelLetter]);
  if (details.napkinColor) rows.push(['Napkin color', details.napkinColorLabel || optionLabel(NAPKIN_COLOR_OPTIONS, details.napkinColor)]);
  if (details.designName) rows.push([details.napkinColor ? 'Embroidery' : 'Name to stitch', details.designName]);
  if (details.monogram) {
    const letters = details.monogram === '3-letter' && details.monogramStitched
      ? `${details.monogramLabel || '3-letter monogram'} · entered ${[details.monogramFirst, details.monogramMiddle, details.monogramLast].filter(Boolean).join(' ')} · stitched ${details.monogramStitched}`
      : (details.monogramLabel || optionLabel(MONOGRAM_OPTIONS, details.monogram));
    rows.push(['Monogram', letters]);
  }
  if (details.threadColor) rows.push(['Thread color', details.threadColorLabel || optionLabel(COLOR_OPTIONS, details.threadColor)]);
  if (details.placement) rows.push(['Placement', details.placementLabel || optionLabel(PLACEMENT_OPTIONS, details.placement)]);
  if (details.extraNotes) rows.push(['Notes', details.extraNotes]);
  if (details.nameVerified) {
    rows.push(['Name confirmed', details.nameVerifiedValue || details.designName || 'Yes']);
    rows.push(['Confirmed at checkout', formatProofTime(details.nameVerifiedAt)]);
    if (details.nameVerifiedAtClient) rows.push(['Checked on device at', formatProofTime(details.nameVerifiedAtClient)]);
    if (details.nameWaiverText) rows.push(['Waiver accepted', details.nameWaiverText]);
  }
  return rows;
}

export function summarizeDesign(item) {
  const parts = [];
  if (item.bundleTheme) parts.push(`Theme: ${optionLabel(BUNDLE_THEME_OPTIONS, item.bundleTheme)}`);
  if (item.towelLetter) parts.push(`Letter: ${letterOnly(item.towelLetter)}`);
  if (item.napkinColor) parts.push(`Napkin: ${optionLabel(NAPKIN_COLOR_OPTIONS, item.napkinColor)}`);
  if (item.designName) parts.push(item.napkinColor ? `Embroider: ${item.designName}` : `Name: ${item.designName}`);
  if (item.monogram === '3-letter' && formatThreeLetterMonogram(item)) {
    parts.push(`Monogram: ${formatThreeLetterMonogram(item)} (First Last Middle)`);
  } else if (item.monogram) {
    parts.push(`Monogram: ${optionLabel(MONOGRAM_OPTIONS, item.monogram)}`);
  }
  if (item.threadColor) parts.push(`Color: ${optionLabel(COLOR_OPTIONS, item.threadColor)}`);
  if (item.placement) parts.push(`Placement: ${optionLabel(PLACEMENT_OPTIONS, item.placement)}`);
  if (item.extraNotes) parts.push(`Notes: ${item.extraNotes}`);
  if (item.nameVerified) parts.push(`Name verified ${item.nameVerifiedAt || ''}`);
  return parts.join('\n');
}
