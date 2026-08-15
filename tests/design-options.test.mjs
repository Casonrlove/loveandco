import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NAME_WAIVER,
  buildDesignProof,
  hasDesignSelections,
  proofRows,
  validateDesignItem,
} from '../lib/design-options.js';

test('each defaulted design field is its own selectable value', () => {
  const item = {
    wantsDesign: true,
    designName: 'Eleanor',
    monogram: '3-letter',
    threadColor: 'navy-blue',
    placement: 'left-chest',
    extraNotes: 'Keep it small',
    nameVerified: true,
    nameVerifiedAt: '2026-08-14T15:04:05.000Z',
    nameVerifiedValue: 'Eleanor',
  };
  assert.equal(hasDesignSelections(item), true);
  const proof = buildDesignProof(item, { now: '2026-08-14T15:10:00.000Z' });
  assert.equal(proof.monogramLabel, '3-letter monogram');
  assert.equal(proof.threadColorLabel, 'Navy blue');
  assert.equal(proof.placementLabel, 'Left chest');
  assert.equal(proof.nameVerified, true);
  assert.equal(proof.nameVerifiedValue, 'Eleanor');
  assert.equal(proof.nameVerifiedAt, '2026-08-14T15:10:00.000Z');
  assert.equal(proof.nameVerifiedAtClient, '2026-08-14T15:04:05.000Z');
  assert.equal(proof.nameWaiverText, NAME_WAIVER);
});

test('name without a confirmation is rejected', () => {
  assert.equal(
    validateDesignItem({ wantsDesign: true, designName: 'Sam', nameVerified: false }),
    'Confirm the spelling on every item that includes a name.',
  );
});

test('confirmed name that no longer matches is rejected', () => {
  assert.equal(
    validateDesignItem({
      wantsDesign: true,
      designName: 'Sam',
      nameVerified: true,
      nameVerifiedValue: 'Samuel',
    }),
    'Name confirmation no longer matches the name to stitch. Confirm the spelling again.',
  );
});

test('design fee items need at least one selection', () => {
  assert.equal(
    validateDesignItem({ wantsDesign: true }),
    'Choose design options or add notes for each piece with a custom design.',
  );
  assert.equal(validateDesignItem({ wantsDesign: true, threadColor: 'gold' }), null);
});

test('studio proof lists the waiver and timestamps per item', () => {
  const rows = proofRows(buildDesignProof({
    wantsDesign: true,
    designName: 'James',
    monogram: '',
    threadColor: 'light-pink',
    placement: 'cuff',
    nameVerified: true,
    nameVerifiedValue: 'James',
    nameVerifiedAt: '2026-08-14T12:00:00.000Z',
  }, { now: '2026-08-14T12:01:00.000Z' }));
  const labels = rows.map(([label]) => label);
  assert.ok(labels.includes('Name to stitch'));
  assert.ok(labels.includes('Name confirmed'));
  assert.ok(labels.includes('Confirmed at checkout'));
  assert.ok(labels.includes('Waiver accepted'));
  assert.equal(rows.find(([label]) => label === 'Waiver accepted')[1], NAME_WAIVER);
});

test('3-letter monogram needs first, middle, and last initials', () => {
  assert.equal(
    validateDesignItem({ wantsDesign: true, monogram: '3-letter', monogramFirst: 'M' }),
    'Enter first, middle, and last initials for the 3-letter monogram.',
  );
  assert.equal(
    validateDesignItem({
      wantsDesign: true,
      monogram: '3-letter',
      monogramFirst: 'm',
      monogramMiddle: 'j',
      monogramLast: 's',
    }),
    null,
  );
});

test('bachelorette package requires design details', () => {
  assert.equal(
    validateDesignItem({ slug: 'bachelorette-package' }),
    'Choose design options or add notes for each piece with a custom design.',
  );
  assert.equal(
    validateDesignItem({ slug: 'bachelorette-package', threadColor: 'navy-blue' }),
    null,
  );
});

test('monogram towel requires one letter and a thread color', () => {
  assert.equal(
    validateDesignItem({ slug: 'monogram-towel' }),
    'Choose 1 letter for the monogram towel.',
  );
  assert.equal(
    validateDesignItem({ slug: 'monogram-towel', towelLetter: 'S' }),
    'Choose a thread color.',
  );
  assert.equal(
    validateDesignItem({ slug: 'monogram-towel', towelLetter: 's', threadColor: 'gold' }),
    null,
  );
});

test('wedding napkins require napkin color, thread color, and embroidery text', () => {
  assert.equal(
    validateDesignItem({ slug: 'wedding-cocktail-napkins' }),
    'Choose a napkin color.',
  );
  assert.equal(
    validateDesignItem({ slug: 'wedding-cocktail-napkins', napkinColor: 'natural' }),
    'Choose a thread color.',
  );
  assert.equal(
    validateDesignItem({ slug: 'wedding-cocktail-napkins', napkinColor: 'natural', threadColor: 'mint' }),
    'Tell me what to embroider on the napkin.',
  );
  assert.equal(
    validateDesignItem({
      slug: 'wedding-cocktail-napkins',
      napkinColor: 'natural',
      threadColor: 'mint',
      designName: 'the O\'Briens',
      nameVerified: true,
      nameVerifiedValue: 'the O\'Briens',
    }),
    null,
  );
});

test('baby bundles require a theme and treat customization as included', () => {
  assert.equal(
    validateDesignItem({ category: 'baby-bundles', designName: 'Sam', nameVerified: true }),
    'Choose a theme for this baby bundle.',
  );
  assert.equal(
    validateDesignItem({
      category: 'baby-bundles',
      bundleTheme: 'cowgirl',
      designName: 'Sam',
      nameVerified: true,
      nameVerifiedValue: 'Sam',
    }),
    null,
  );
});
