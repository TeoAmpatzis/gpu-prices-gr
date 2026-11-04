import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { Dialog } from '../../ui/overlays';
import { Button } from '../../ui/Button';
import { UI } from '../../ui/strings';
import { tr, type Lang } from '../../lib/i18n';

const S = {
  title: { el: 'Κοινοποίηση σύνθεσης', en: 'Share this build' },
  link: { el: 'Σύνδεσμος σύνθεσης', en: 'Build link' },
  intro: { el: 'Όποιος έχει τον σύνδεσμο μπορεί να δει τη σύνθεση.', en: 'Anyone with the link can view this build.' },
  content: { el: 'Τα εξαρτήματα και οι επιλογές προσφορών είναι κωδικοποιημένα στον σύνδεσμο. Οι τιμές και οι έλεγχοι ενημερώνονται από τα διαθέσιμα στοιχεία όταν ανοίγει.', en: 'Parts and offer choices are encoded in the link. Prices and checks use available data when it opens.' },
  local: { el: 'Δεν αποθηκεύεται στο cloud. Κράτησε ολόκληρο τον σύνδεσμο· ένα ελλιπές αντίγραφο μπορεί να μην ανοίξει σωστά.', en: 'No cloud storage. Keep the whole link; an incomplete copy may not open correctly.' },
  copy: { el: 'Αντιγραφή', en: 'Copy' },
  copied: { el: 'Ο σύνδεσμος αντιγράφηκε.', en: 'Link copied.' },
  failed: { el: 'Η αντιγραφή δεν επιτράπηκε. Επίλεξε και αντέγραψε τον σύνδεσμο παραπάνω.', en: 'Copy was not allowed. Select and copy the link above.' },
};

export default function ShareDialog({ link, lang, disabled = false, copy }: { link: string; lang: Lang; disabled?: boolean; copy: (value: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<boolean | null>(null);
  const t = (x: { el: string; en: string }) => tr(lang, x);
  return <>
    <button type="button" data-share-open disabled={disabled} onClick={() => { setStatus(null); setOpen(true); }} className="builder-action tap disabled:opacity-50"><Link2 size={16} aria-hidden="true" />{t(S.title)}</button>
    <Dialog open={open} title={t(S.title)} onClose={() => setOpen(false)} actions={<Button onClick={() => setOpen(false)}>{t(UI.close)}</Button>}>
      <div className="builder-share">
        <p>{t(S.intro)}</p>
        <label htmlFor="dialog-share-link">{t(S.link)}</label>
        <div className="flex flex-wrap gap-2">
          <input id="dialog-share-link" className="field min-w-0 flex-1 px-3 py-2 font-mono text-xs" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button variant="primary" onClick={async () => setStatus(await copy(link))}>{t(S.copy)}</Button>
        </div>
        <p role="status" className={status === true ? 'text-ok' : 'text-muted'}>{status !== null && t(status ? S.copied : S.failed)}</p>
        <p className="border-t border-line pt-3">{t(S.content)}</p>
        <p>{t(S.local)}</p>
      </div>
    </Dialog>
  </>;
}
