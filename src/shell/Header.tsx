import { ArrowLeft, ChevronDown, LayoutGrid, Search, Wrench } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { tr, useLang } from '../lib/i18n';
import type { Category } from '../types';
import { Button, LinkButton } from '../ui/Button';
import { Wordmark } from '../ui/logos';
import { SearchBox, type SearchSetup } from '../ui/SearchBox';
import { UI } from '../ui/strings';
import { LangSwitch } from './controls';
import { MegaMenu, type Current } from './MegaMenu';
import { href } from './nav';

/**
 * The site header (plan A5).
 *   ≥ 1024 px: logo · Εξαρτήματα ▾ · search · PC Builder · ΕΛ/EN
 *   640–1023: the same in one row without the search, which gets a second row
 *   < 640:    compact logo · search · Εξαρτήματα (to /parts, which also holds the language switch)
 * A skip link is the first Tab stop (UX-05). The menu opens on click, Enter, Space or ↓ (never on hover),
 * and closes on Esc (focus back to its button), an outside click or a pick.
 */
export function Header({
  current,
  search,
  counts,
  menuOpen: initialMenu = false,
  phoneSearchOpen = false,
  phoneSearchQuery = '',
}: {
  current: Current;
  search: SearchSetup;
  counts?: Partial<Record<Category, number>>;
  menuOpen?: boolean;
  phoneSearchOpen?: boolean;
  /** Catalogue only: text already typed in the phone search panel. */
  phoneSearchQuery?: string;
}) {
  const lang = useLang();
  const [menu, setMenu] = useState(initialMenu);
  const [phoneSearch, setPhoneSearch] = useState(phoneSearchOpen);
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const phoneDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = phoneDialogRef.current;
    if (!dialog) return;
    if (!phoneSearch) {
      if (dialog.open) dialog.close();
      return;
    }
    dialog.showModal();
    dialog.querySelector('input')?.focus();
    const desktop = window.matchMedia('(min-width: 640px)');
    const closeOnDesktop = () => desktop.matches && setPhoneSearch(false);
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [phoneSearch]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        btnRef.current?.focus();
      }
    };
    const away = (e: PointerEvent) => !boxRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', away);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', away);
    };
  }, [menu]);

  const openMenuWithKeys = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    setMenu(true);
    requestAnimationFrame(() => document.getElementById(menuId)?.querySelector<HTMLElement>('a')?.focus());
  };

  return (
    <header className="relative z-30 border-b border-line bg-panel">
      <a
        href="#main"
        className="ui-btn ui-btn--primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        {tr(lang, UI.skip)}
      </a>
      <div ref={boxRef} className="site-container relative flex min-h-14 items-center gap-2 py-1 sm:min-h-[60px] sm:gap-3 sm:py-2">
        <a href={href.home} aria-label={tr(lang, UI.homeLink)} className="tap mr-1 flex shrink-0 items-center rounded-md text-fg">
          <Wordmark className="text-[1.375rem]" />
        </a>

        <button
          ref={btnRef}
          type="button"
          aria-expanded={menu}
          aria-controls={menuId}
          onClick={() => setMenu(!menu)}
          onKeyDown={openMenuWithKeys}
          className={`ui-btn hidden gap-1 sm:inline-flex ${menu ? 'ui-btn--secondary' : 'ui-btn--ghost'}`}
        >
          {tr(lang, UI.parts)}
          <ChevronDown className={`h-4 w-4 transition-transform duration-[var(--motion-fast)] ${menu ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        <div className="header-search hidden min-w-0 max-w-[560px] flex-1 lg:block">
          <SearchBox setup={search} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LinkButton variant="primary" icon={Wrench} href={href.builder} aria-current={current === 'builder' ? 'page' : undefined} className="hidden sm:inline-flex">
            PC Builder
          </LinkButton>
          <span className="hidden items-center sm:flex">
            <LangSwitch />
          </span>
          <span className="flex items-center sm:hidden">
            <button ref={searchBtnRef} type="button" className="ui-btn ui-btn--ghost ui-btn--icon" onClick={() => setPhoneSearch(true)}>
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="sr-only">{tr(lang, UI.search)}</span>
            </button>
            {/* The compact export keeps only search and parts beside the wordmark. Builder stays in /parts. */}
            <LinkButton variant="ghost" icon={LayoutGrid} iconOnly href={href.parts}>
              {tr(lang, UI.parts)}
            </LinkButton>
          </span>
        </div>

        {menu && (
          <div className="shell-menu ui-enter-pop absolute top-full z-40 mt-2">
            <MegaMenu id={menuId} current={current} counts={counts} onPick={() => setMenu(false)} />
          </div>
        )}
      </div>

      <div className="site-container header-search hidden pb-3 sm:block lg:hidden">
        <SearchBox setup={search} />
      </div>

      <dialog
        ref={phoneDialogRef}
        aria-label={tr(lang, UI.search)}
        onClose={() => {
          setPhoneSearch(false);
          searchBtnRef.current?.focus();
        }}
        onKeyDownCapture={(e) => {
          if (e.key === 'Tab') {
            const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]')];
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (e.shiftKey && document.activeElement === first || !e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              (e.shiftKey ? last : first)?.focus();
            }
          }
          if (e.key !== 'Escape') return;
          const input = e.target as HTMLElement;
          if (input.getAttribute('role') === 'combobox' && input.getAttribute('aria-expanded') === 'true') return;
          e.preventDefault();
          setPhoneSearch(false);
        }}
        className="shell-search-dialog ui-enter-fade bg-page text-fg backdrop:bg-page/80"
      >
        {phoneSearch && <>
          <div className="flex items-start gap-1 border-b border-line bg-panel p-2">
            <Button variant="ghost" icon={ArrowLeft} iconOnly onClick={() => setPhoneSearch(false)}>
              {tr(lang, UI.back)}
            </Button>
            <div className="min-w-0 flex-1">
              <SearchBox setup={{ ...search, go: (target) => { setPhoneSearch(false); search.go(target); } }} variant="panel" autoFocus initialOpen initialQuery={phoneSearchQuery} />
            </div>
          </div>
        </>}
      </dialog>
    </header>
  );
}
