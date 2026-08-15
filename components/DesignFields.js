'use client';

import { BUNDLE_THEME_OPTIONS, COLOR_OPTIONS, MONOGRAM_OPTIONS, MONOGRAM_ORDER_NOTE, NAPKIN_COLOR_OPTIONS, NAPKIN_EXTRA_COLOR_NOTE, NAME_SPELLING_NOTE, NAME_WAIVER_LABEL, PLACEMENT_OPTIONS, letterOnly, requiresCustomization } from '@/lib/design-options';
import FancySelect from './FancySelect';

export const emptyDesignDraft = {
  wantsDesign: false,
  bundleTheme: '',
  bundleAddons: { outfit: 0, burp: 0, bib: 0, paci: 0 },
  napkinColor: '',
  towelLetter: '',
  designName: '',
  monogram: '',
  monogramFirst: '',
  monogramMiddle: '',
  monogramLast: '',
  threadColor: '',
  placement: '',
  extraNotes: '',
  nameVerified: false,
  nameVerifiedAt: '',
  nameVerifiedValue: '',
};

export function applyDesignPatch(item, patch) {
  const next = { ...item, ...patch };
  if (Object.hasOwn(patch, 'designName') && patch.designName !== item.designName) {
    next.nameVerified = false;
    next.nameVerifiedAt = '';
    next.nameVerifiedValue = '';
  }
  if (Object.hasOwn(patch, 'nameVerified')) {
    if (patch.nameVerified && String(next.designName || '').trim()) {
      next.nameVerified = true;
      next.nameVerifiedAt = new Date().toISOString();
      next.nameVerifiedValue = next.designName.trim();
    } else {
      next.nameVerified = false;
      next.nameVerifiedAt = '';
      next.nameVerifiedValue = '';
    }
  }
  return next;
}

export function designDraftFor(product) {
  return requiresCustomization(product)
    ? { ...emptyDesignDraft, wantsDesign: true }
    : { ...emptyDesignDraft };
}

export default function DesignFields({ item, onChange, showTheme = false, napkinFields = false, towelFields = false }) {
  const update = (patch) => onChange(applyDesignPatch(item, patch));
  if (towelFields) {
    return (
      <div className="design-fields">
        <label>Letter
          <input
            className="monogram-letter-input"
            value={item.towelLetter || ''}
            maxLength={1}
            autoComplete="off"
            spellCheck="false"
            onChange={(event) => update({ towelLetter: letterOnly(event.target.value) })}
          />
        </label>
        <label>Thread color
          <FancySelect
            required
            value={item.threadColor || ''}
            onChange={(value) => update({ threadColor: value })}
            options={COLOR_OPTIONS.filter((option) => option.value)}
            placeholder="Choose a thread color"
          />
        </label>
      </div>
    );
  }
  if (napkinFields) {
    return (
      <div className="design-fields">
        <label>Color of napkin
          <FancySelect
            required
            value={item.napkinColor || ''}
            onChange={(value) => update({ napkinColor: value })}
            options={NAPKIN_COLOR_OPTIONS}
            placeholder="Choose a napkin color"
          />
        </label>
        <label>Thread color
          <FancySelect
            required
            value={item.threadColor || ''}
            onChange={(value) => update({ threadColor: value })}
            options={COLOR_OPTIONS.filter((option) => option.value)}
            placeholder="Choose a thread color"
          />
          <small className="design-note">{NAPKIN_EXTRA_COLOR_NOTE}</small>
        </label>
        <label className="name-field">
          <span>What to embroider on the napkin</span>
          <textarea
            value={item.designName || ''}
            onChange={(event) => update({ designName: event.target.value })}
            placeholder="Names, date, monogram, or wording"
          />
          <small className="design-note">{NAME_SPELLING_NOTE}</small>
        </label>
        {String(item.designName || '').trim() && (
          <label className="name-confirm">
            <input
              className="name-confirm-check"
              type="checkbox"
              checked={Boolean(item.nameVerified)}
              onChange={(event) => update({ nameVerified: event.target.checked })}
            />
            <span className="name-confirm-copy">
              <strong>{NAME_WAIVER_LABEL}</strong>
              <small>Love & Co. isn’t responsible for name errors after you approve.</small>
            </span>
          </label>
        )}
        <label>Anything else
          <textarea value={item.extraNotes || ''} onChange={(event) => update({ extraNotes: event.target.value })} placeholder="Optional extra notes, including extra thread colors" />
        </label>
      </div>
    );
  }
  return (
    <div className="design-fields">
      {showTheme && (
        <label>Theme
          <FancySelect
            required
            value={item.bundleTheme || ''}
            onChange={(value) => update({ bundleTheme: value })}
            options={BUNDLE_THEME_OPTIONS}
            placeholder="Choose a theme"
          />
        </label>
      )}
      <label className="name-field">
        <span>Name to stitch</span>
        <input
          className="name-field-input"
          value={item.designName || ''}
          onChange={(event) => update({ designName: event.target.value })}
          placeholder="Type the name"
          autoComplete="off"
          spellCheck="false"
        />
        <small className="design-note">{NAME_SPELLING_NOTE}</small>
      </label>
      {String(item.designName || '').trim() && (
        <label className="name-confirm">
          <input
            className="name-confirm-check"
            type="checkbox"
            checked={Boolean(item.nameVerified)}
            onChange={(event) => update({ nameVerified: event.target.checked })}
          />
          <span className="name-confirm-copy">
            <strong>{NAME_WAIVER_LABEL}</strong>
            <small>Love & Co. isn’t responsible for name errors after you approve.</small>
          </span>
        </label>
      )}
      <div className="design-fields-row">
        <label>Monogram
          <FancySelect value={item.monogram || ''} onChange={(value) => update({ monogram: value })} options={MONOGRAM_OPTIONS} />
        </label>
        <label>Thread color
          <FancySelect value={item.threadColor || ''} onChange={(value) => update({ threadColor: value })} options={COLOR_OPTIONS} />
        </label>
        <label>Placement
          <FancySelect value={item.placement || ''} onChange={(value) => update({ placement: value })} options={PLACEMENT_OPTIONS} />
        </label>
      </div>
      {item.monogram === '3-letter' && (
        <div className="monogram-letter-box">
          <p>Enter initials in this order: first, then middle, then last.</p>
          <div className="monogram-letter-row">
            {[
              ['monogramFirst', 'First'],
              ['monogramMiddle', 'Middle'],
              ['monogramLast', 'Last'],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  className="monogram-letter-input"
                  value={item[key] || ''}
                  maxLength={1}
                  autoComplete="off"
                  spellCheck="false"
                  onChange={(event) => update({ [key]: letterOnly(event.target.value) })}
                />
              </label>
            ))}
          </div>
          <small className="design-note">{MONOGRAM_ORDER_NOTE}</small>
        </div>
      )}
      <label>Anything else to stitch
        <textarea value={item.extraNotes || ''} onChange={(event) => update({ extraNotes: event.target.value })} placeholder="Optional extra notes" />
      </label>
    </div>
  );
}
