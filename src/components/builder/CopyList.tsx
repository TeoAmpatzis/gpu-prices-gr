// Review's Copy list and share link (step 5 task 13, #27): the list as text (copyList.ts: each line's listing used, its
// price, shop and link, the total, the prices' date and the share link) and the v2 share link (share.ts), each copied
// with the Clipboard API or, where that is refused (some in-app browsers), the old select-and-copy.
import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, Link2 } from 'lucide-react';
import type { BuilderState } from '../../lib/builderState';
import { copyListText } from '../../lib/copyList';
import { tr, type Lang, type Text } from '../../lib/i18n';
import { BUILDER as B } from '../../ui/builderStrings';
import ShareDialog from './ShareDialog';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { return document.execCommand('copy'); } catch { return false; } finally { ta.remove(); }
  }
}

export default function CopyList({ state, lang, date, toolbar = false }: { state: BuilderState; lang: Lang; date: string | null; toolbar?: boolean }) {
  const t = (x: Text) => tr(lang, x);
  const [copied, setCopied] = useState<'list' | 'link' | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const lines = state.resolvedLines;
  const link = state.shareUrl;
  const restoring = state.pending.length > 0 || state.pendingStorage2;
  // The lines' shop links and titles come from each step's extra file: Copy list waits for it; a failed one is said.
  const extra = lines.map((r) => state.extraState[r.line === 'storage2' ? 'storage' : r.line]);
  const linksLoading = extra.includes(undefined);
  const linksMissing = !linksLoading && extra.includes(false);
  // Built when copied, so the shop links (which arrive later) are in it.
  const copy = async (what: 'list' | 'link') => {
    setFailed(false);
    if (await copyText(what === 'list' ? copyListText(lines, { lang, date, link }) : link)) {
      setCopied(what);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 2000);
    } else setFailed(true);
  };
  const button = (what: 'list' | 'link', label: Text, Icon: typeof Link2) => (
    <button
      type="button"
      onClick={() => copy(what)}
      disabled={!lines.length || restoring || (what === 'list' && linksLoading)}
      data-copy={what}
      className="tap inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent ring-1 ring-inset ring-accent/30 hover:bg-accent/10 disabled:cursor-not-allowed disabled:text-muted disabled:ring-line-strong disabled:hover:bg-transparent"
    >
      {copied === what ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{t(copied === what ? B.copied : label)}</span>
    </button>
  );
  return (
    <div className={toolbar ? 'builder-copy-toolbar' : 'flex flex-col gap-3'}>
      <div className="flex flex-wrap gap-2">
        <ShareDialog link={link} lang={lang} disabled={restoring || (!lines.length && !state.sharedBuild)} copy={copyText} />
        {button('list', B.copyList, ClipboardCopy)}
        {button('link', B.copyLink, Link2)}
      </div>
      {failed && <p role="alert" className="text-xs text-warn">{t({ el: 'Η αντιγραφή δεν επιτράπηκε. Αντέγραψε τον σύνδεσμο από την κοινοποίηση.', en: 'Copy was not allowed. Copy the link from the share dialog.' })}</p>}
      {lines.length > 0 && (linksLoading || linksMissing) && (
        <p className="-mt-1 text-xs text-muted" data-links={linksLoading ? 'loading' : 'missing'}>
          {t(linksLoading ? B.linksLoading : B.linksMissing)}
        </p>
      )}
      {lines.length > 0 && (
        <div className={toolbar ? 'sr-only' : undefined}>
          <label htmlFor="share-link" className="mb-1 block text-sm font-semibold">
            {t(B.link)}
          </label>
          <input id="share-link" readOnly disabled={restoring} value={restoring ? '' : link} onFocus={(e) => e.currentTarget.select()} className="field w-full py-2 pl-3 pr-3 text-sm text-muted" />
          <p className="mt-1 text-xs text-muted">{t(B.linkHint)}</p>
        </div>
      )}
    </div>
  );
}
