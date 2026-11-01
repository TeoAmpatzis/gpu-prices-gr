// Named saved builds (step 5 task 13, owner answer 12): the savedBuilds.ts operations in one dialog — save the build on
// screen under a name, open, rename, duplicate, delete. Actions that would lose a build ask first (deleting; opening or
// duplicating while the current build is not saved under a name). A refused write says so (storage full or off).
// The builder follows the change through the build store (builderState: a write of `pcBuild` in this tab).

import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import type { BuilderState } from '../../lib/builderState';
import { readBuild } from '../../lib/buildStore';
import {
  NOT_FOUND_TEXT,
  NOT_STORED_TEXT,
  duplicateBuild,
  openBuild,
  readSavedBuilds,
  removeBuild,
  renameBuild,
  saveBuildAs,
  type SaveResult,
} from '../../lib/savedBuilds';
import { tr, type Lang, type Text } from '../../lib/i18n';
import { Dialog, Toast, ToastRegion } from '../../ui/overlays';
import { Button } from '../../ui/Button';
import { UI } from '../../ui/strings';
import { BUILDER as B, fill } from '../../ui/builderStrings';

type Mode =
  | { kind: 'list' }
  | { kind: 'name'; id?: string; value: string }
  | { kind: 'confirm'; text: string; danger?: boolean; run: () => void };

/** The current build would be lost by replacing it: it has parts and no named build holds it. */
const unsaved = () => {
  const b = readBuild();
  return readSavedBuilds().active == null && (Object.keys(b.parts).length > 0 || !!b.storage2);
};

export default function SavedBuildsMenu({ state, lang }: { state: BuilderState; lang: Lang }) {
  const t = (x: Text) => tr(lang, x);
  const [mode, setMode] = useState<Mode | null>(null);
  const [toast, setToast] = useState<{ n: number; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);
  const say = (text: string) => setToast((p) => ({ n: (p?.n ?? 0) + 1, text }));
  const saved = readSavedBuilds();
  const builds = Object.entries(saved.builds).sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt));
  const nameOf = (id: string) => saved.builds[id]?.name ?? '';
  const close = () => setMode(null);
  /** Runs `run` at once, or after a confirmation when the current build would be lost. */
  const guarded = (run: () => void) => (unsaved() ? setMode({ kind: 'confirm', text: t(B.confirmReplace), run }) : run());
  const done = (ok: boolean, text: string) => {
    close();
    say(ok ? text : t(NOT_STORED_TEXT));
  };

  /** A save's answer: the done message, or the refusal's own (30 builds, storage full or off). */
  const result = (r: SaveResult, text: () => string) => {
    close();
    say(r.ok ? text() : t(r.message));
  };
  const open = (id: string) =>
    guarded(() => {
      const name = nameOf(id);
      close();
      say(openBuild(id) ? fill(t(B.openedToast), { name }) : t(NOT_FOUND_TEXT));
    });
  const duplicate = (id: string) =>
    guarded(() => {
      const r = duplicateBuild(id);
      result(r, () => fill(t(B.savedToast), { name: r.ok ? (readSavedBuilds().builds[r.id]?.name ?? '') : '' }));
    });
  const remove = (id: string) =>
    setMode({
      kind: 'confirm',
      danger: true,
      text: fill(t(B.confirmDelete), { name: nameOf(id) }),
      run: () => done(removeBuild(id), fill(t(B.deletedToast), { name: nameOf(id) })),
    });
  const submitName = (id: string | undefined, value: string) => {
    const name = value.trim() || fill(t(B.defaultName), { n: builds.length + 1 });
    if (id) return done(renameBuild(id, name), fill(t(B.renamedToast), { name }));
    // A shared link on screen is saved as it arrived (parts no longer sold included, not dropped), then opened (it
    // becomes the user's own); else the current build.
    const shared = state.sharedBuild;
    const save = () => {
      const r = saveBuildAs(name, shared);
      if (r.ok && shared) openBuild(r.id);
      result(r, () => fill(t(B.savedToast), { name }));
    };
    if (shared) guarded(save);
    else save();
  };

  const action = (label: Text, onClick: () => void, disabled = false) => (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={disabled}>
      {t(label)}
    </Button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMode({ kind: 'list' })}
        className="tap inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-hover hover:text-fg"
        data-saved-builds
      >
        <FolderOpen className="h-4 w-4" aria-hidden="true" />
        <span>
          {t(B.savedBuilds)}
          {builds.length > 0 && ` (${builds.length})`}
        </span>
      </button>
      <Dialog
        open={mode != null}
        title={mode?.kind === 'name' ? t(mode.id ? B.rename : B.saveAs) : mode?.kind === 'confirm' ? t(mode.danger ? B.delete : B.continue) : t(B.savedBuilds)}
        onClose={close}
        actions={
          mode?.kind === 'confirm' ? (
            <>
              <Button onClick={() => setMode({ kind: 'list' })}>{t(UI.cancel)}</Button>
              <Button variant={mode.danger ? 'danger' : 'primary'} onClick={mode.run}>
                {t(mode.danger ? B.delete : B.continue)}
              </Button>
            </>
          ) : mode?.kind === 'name' ? (
            <>
              <Button onClick={() => setMode({ kind: 'list' })}>{t(UI.cancel)}</Button>
              <Button variant="primary" type="submit" form="saved-build-name">
                {t(B.save)}
              </Button>
            </>
          ) : (
            <Button onClick={close}>{t(UI.close)}</Button>
          )
        }
      >
        {mode?.kind === 'confirm' && <p data-confirm>{mode.text}</p>}
        {mode?.kind === 'name' && (
          <form
            id="saved-build-name"
            onSubmit={(e) => {
              e.preventDefault();
              submitName(mode.id, mode.value);
            }}
          >
            <label htmlFor="saved-build-input" className="mb-1 block text-sm font-semibold text-fg">
              {t(B.name)}
            </label>
            <input
              id="saved-build-input"
              autoFocus
              maxLength={60}
              value={mode.value}
              onChange={(e) => setMode({ ...mode, value: e.target.value })}
              className="field w-full py-2 pl-3 pr-3"
            />
          </form>
        )}
        {mode?.kind === 'list' && (
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={() => setMode({ kind: 'name', value: fill(t(B.defaultName), { n: builds.length + 1 }) })}>
              {t(B.saveAs)}
            </Button>
            {builds.length === 0 ? (
              <p>{t(B.noSaved)}</p>
            ) : (
              <ul className="flex max-h-[50vh] flex-col divide-y divide-line overflow-y-auto">
                {builds.map(([id, b]) => (
                  <li key={id} className="flex flex-col gap-1 py-2" data-saved-build={b.name}>
                    <div className="text-fg">
                      <span className="font-medium [overflow-wrap:anywhere]">{b.name}</span>
                      {saved.active === id && <span className="text-accent"> · {t(B.isOpen)}</span>}
                      {b.savedAt && (
                        <span className="text-faint">
                          {' '}
                          · {t(B.changed)} {new Date(b.savedAt).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {action(B.open, () => open(id), saved.active === id)}
                      {action(B.rename, () => setMode({ kind: 'name', id, value: b.name }))}
                      {action(B.duplicate, () => duplicate(id))}
                      {action(B.delete, () => remove(id))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Dialog>
      {toast && (
        <ToastRegion>
          <Toast key={toast.n} text={toast.text} />
        </ToastRegion>
      )}
    </>
  );
}
