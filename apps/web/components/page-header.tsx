'use client';

import type { MessageKey, MessageValues } from '@/lib/i18n';
import { usePreferences } from './preferences-provider';

type PageHeaderProps = {
  eyebrowKey: MessageKey;
  titleKey: MessageKey;
  descriptionKey?: MessageKey;
  titleValues?: MessageValues;
  meta?: React.ReactNode;
};

export function PageHeader({
  eyebrowKey,
  titleKey,
  descriptionKey,
  titleValues,
  meta,
}: PageHeaderProps) {
  const { t } = usePreferences();
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="section-label">{t(eyebrowKey)}</p>
        <h1>{t(titleKey, titleValues)}</h1>
        {descriptionKey ? <p className="page-description">{t(descriptionKey)}</p> : null}
      </div>
      {meta ? <div className="page-header-meta">{meta}</div> : null}
    </header>
  );
}
