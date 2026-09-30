import assert from 'node:assert/strict';
import test from 'node:test';
import IntlMessageFormat from 'intl-messageformat';

import { en } from '../lib/i18n/catalog/en.ts';
import { ja } from '../lib/i18n/catalog/ja.ts';
import { ko } from '../lib/i18n/catalog/ko.ts';
import { zhCN } from '../lib/i18n/catalog/zh-CN.ts';
import { zhTW } from '../lib/i18n/catalog/zh-TW.ts';
import { intlLocale, normalizeLocale, translate } from '../lib/i18n/index.ts';

test('normalizes supported browser and persisted locale values', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh-CN');
  assert.equal(normalizeLocale('zh-SG'), 'zh-CN');
  assert.equal(normalizeLocale('zh-Hant-HK'), 'zh-TW');
  assert.equal(normalizeLocale('en-US'), 'en');
  assert.equal(normalizeLocale('ja-JP'), 'ja');
  assert.equal(normalizeLocale('ko-KR'), 'ko');
});

test('keeps product terminology aligned across all five catalogs', () => {
  assert.equal(translate('en', 'nav.passport'), 'Passport');
  assert.equal(translate('zh-CN', 'nav.passport'), 'Passport');
  assert.equal(translate('zh-TW', 'nav.passport'), 'Passport');
  assert.equal(translate('ja', 'nav.passport'), 'Passport');
  assert.equal(translate('ko', 'nav.passport'), 'Passport');

  assert.equal(translate('en', 'milestone.registration.title'), 'Complete presale registration');
  assert.equal(translate('zh-CN', 'milestone.registration.title'), '完成预售报名');
  assert.equal(translate('zh-TW', 'milestone.registration.title'), '完成預售登記');
  assert.equal(translate('ja', 'milestone.registration.title'), '先行受付に申し込む');
  assert.equal(translate('ko', 'milestone.registration.title'), '선예매 신청');
});

test('keeps every locale catalog and interpolation variable aligned', () => {
  const argumentNames = (message: string) => {
    const names = new Set<string>();
    const visit = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') {
        const element = value as Record<string, unknown>;
        if (typeof element.type === 'number' && element.type !== 0 && typeof element.value === 'string') {
          names.add(element.value);
        }
        Object.values(element).forEach(visit);
      }
    };
    visit(new IntlMessageFormat(message, 'en').getAst());
    return [...names].sort();
  };
  for (const catalog of [zhCN, zhTW, ja, ko]) {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(en).sort());
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      assert.deepEqual(argumentNames(catalog[key]), argumentNames(en[key]), key);
    }
  }
});

test('interpolates values without changing locale-specific sentence structure', () => {
  assert.equal(translate('en', 'plans.active', { count: 2 }), '2 active journeys');
  assert.equal(translate('zh-CN', 'plans.active', { count: 2 }), '2 段进行中的行程');
  assert.equal(translate('zh-TW', 'plans.active', { count: 2 }), '2 段進行中的行程');
  assert.equal(translate('ja', 'plans.active', { count: 2 }), '進行中の予定 2件');
  assert.equal(translate('ko', 'plans.active', { count: 2 }), '진행 중인 일정 2개');
});

test('formats ICU plural messages with locale-aware branches', () => {
  assert.equal(translate('en', 'passport.ownerSummary', { owner: 'Mina', count: 1 }), 'Mina · 1 show');
  assert.equal(translate('en', 'passport.ownerSummary', { owner: 'Mina', count: 3 }), 'Mina · 3 shows');
  assert.equal(translate('zh-CN', 'home.daysToGo', { days: 4 }), '天');
});

test('maps product locales to explicit Intl locale identifiers', () => {
  assert.equal(intlLocale('en'), 'en-GB');
  assert.equal(intlLocale('zh-CN'), 'zh-Hans');
  assert.equal(intlLocale('zh-TW'), 'zh-Hant');
  assert.equal(intlLocale('ja'), 'ja-JP');
  assert.equal(intlLocale('ko'), 'ko-KR');
});
