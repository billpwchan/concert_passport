import assert from 'node:assert/strict';
import test from 'node:test';

import { intlLocale, normalizeLocale, translate } from '../lib/i18n/index.ts';

test('normalizes supported browser and persisted locale values', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh-CN');
  assert.equal(normalizeLocale('zh-SG'), 'zh-CN');
  assert.equal(normalizeLocale('zh-Hant-HK'), 'zh-TW');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('ko-KR'), 'en');
});

test('keeps product terminology aligned across all three catalogs', () => {
  assert.equal(translate('en', 'nav.passport'), 'Passport');
  assert.equal(translate('zh-CN', 'nav.passport'), '护照');
  assert.equal(translate('zh-TW', 'nav.passport'), '護照');

  assert.equal(translate('en', 'milestone.registration.title'), 'Complete presale registration');
  assert.equal(translate('zh-CN', 'milestone.registration.title'), '完成预售报名');
  assert.equal(translate('zh-TW', 'milestone.registration.title'), '完成預售登記');
});

test('interpolates values without changing locale-specific sentence structure', () => {
  assert.equal(translate('en', 'home.evidenceCount', { count: 2 }), '2 official references');
  assert.equal(translate('zh-CN', 'home.evidenceCount', { count: 2 }), '2 个官方来源');
  assert.equal(translate('zh-TW', 'home.evidenceCount', { count: 2 }), '2 個官方來源');
});

test('maps product locales to explicit Intl locale identifiers', () => {
  assert.equal(intlLocale('en'), 'en-GB');
  assert.equal(intlLocale('zh-CN'), 'zh-Hans');
  assert.equal(intlLocale('zh-TW'), 'zh-Hant');
});
