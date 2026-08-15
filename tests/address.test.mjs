import assert from 'node:assert/strict';
import test from 'node:test';
import { addressFromGoogleComponents, expandRuralQuery, formatZip, isValidZip, validateAddress, validateOptionalAddress } from '../lib/address.js';

test('formats ZIP and ZIP+4 while typing', () => {
  assert.equal(formatZip('3'), '3');
  assert.equal(formatZip('37064'), '37064');
  assert.equal(formatZip('370641234'), '37064-1234');
  assert.equal(formatZip('37064-1234'), '37064-1234');
});

test('accepts 5-digit and ZIP+4 only', () => {
  assert.equal(isValidZip('37064'), true);
  assert.equal(isValidZip('37064-1234'), true);
  assert.equal(isValidZip('3706'), false);
  assert.equal(isValidZip('ABCDE'), false);
});

test('validates a complete U.S. address', () => {
  assert.equal(validateAddress({
    address_line: '123 Main St',
    city: 'Franklin',
    region: 'TN',
    postal_code: '37064',
  }), null);
  assert.equal(validateAddress({
    address_line: '123 Main St',
    city: 'Franklin',
    region: 'Tennessee',
    postal_code: '37064',
  }), null);
  assert.equal(validateAddress({
    address_line: '123 Main St',
    city: 'Franklin',
    region: 'XX',
    postal_code: '37064',
  }), 'Choose a U.S. state.');
  assert.equal(validateAddress({
    address_line: '123 Main St',
    city: 'Franklin',
    region: 'TN',
    postal_code: '370',
  }), 'Enter a 5-digit ZIP code.');
});

test('optional account address can be empty or complete', () => {
  assert.equal(validateOptionalAddress({}), null);
  assert.equal(validateOptionalAddress({ city: 'Franklin' }), 'Add a street address.');
});

test('expands CR to County Road', () => {
  assert.equal(expandRuralQuery('5440 CR 256'), '5440 County Road 256');
  assert.equal(expandRuralQuery('5440 Co Rd 256'), '5440 County Road 256');
});

test('parses a Google place into street, city, state, and ZIP', () => {
  const parsed = addressFromGoogleComponents([
    { longText: '850', shortText: '850', types: ['street_number'] },
    { longText: 'Greenside Drive', shortText: 'Greenside Dr', types: ['route'] },
    { longText: 'Richardson', shortText: 'Richardson', types: ['locality'] },
    { longText: 'Texas', shortText: 'TX', types: ['administrative_area_level_1'] },
    { longText: '75080', shortText: '75080', types: ['postal_code'] },
  ]);
  assert.equal(parsed.address_line, '850 Greenside Drive');
  assert.equal(parsed.city, 'Richardson');
  assert.equal(parsed.region, 'TX');
  assert.equal(parsed.postal_code, '75080');
});

test('keeps apartment or unit from a Google place', () => {
  const parsed = addressFromGoogleComponents([
    { long_name: 'apt 2020', short_name: 'apt 2020', types: ['subpremise'] },
    { long_name: '850', short_name: '850', types: ['street_number'] },
    { long_name: 'Greenside Drive', short_name: 'Greenside Dr', types: ['route'] },
    { long_name: 'Richardson', short_name: 'Richardson', types: ['locality'] },
    { long_name: 'Texas', short_name: 'TX', types: ['administrative_area_level_1'] },
    { long_name: '75080', short_name: '75080', types: ['postal_code'] },
  ]);
  assert.equal(parsed.address_line, '850 Greenside Drive');
  assert.equal(parsed.address_line2, 'Apt 2020');
});
