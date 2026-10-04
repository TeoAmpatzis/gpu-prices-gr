import { ArrowLeft, ChevronDown, LayoutGrid, Search, Wrench } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { tr, useLang } from '../lib/i18n';
import type { Category } from '../types';
import { Button, LinkButton } from '../ui/Button';
import { Lockup, type LogoKind } from '../ui/logos';
import { SearchBox, type SearchSetup } from '../ui/SearchBox';
import { UI } from '../ui/strings';
import { LangSwitch, ThemeSwitch } from './controls';
import { MegaMenu, type Current } from './MegaMenu';
import { href } from './nav';

/**
 * The site header (plan A5).
 *   ≥ 1024 px: logo · Εξαρτήματα ▾ · search · PC Builder · ΕΛ/EN · theme
 *   640–1023: the same in one row without the search, which gets a second row
 *   < 640:    logo · search · PC Builder · Εξαρτήματα (to /parts, which also holds language and theme)
 * A skip link is the first Tab stop (UX-05). The menu opens on click, Enter, Space or ↓ (never on hover),
 * and closes on Esc (focus back to its button), an outside click or a pick.
 */
export function Header({
  logo,
  current,
  search,
  counts,
  menuOpen: initialMenu = false,
  phoneSearchOpen = false,
  phoneSearchQuery = '',
}: {
  logo: LogoKind;
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
      <div ref={boxRef} className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <a href={href.home} aria-label={tr(lang, UI.homeLink)} className="tap mr-1 flex shrink-0 items-center rounded-md text-fg">
          <Lockup kind={logo} height={28} className={logo === 'c' ? 'text-[1.375rem]' : 'text-lg'} />
        </a>

        <button
          ref={btnRef}
          type="button"
          aria-expanded={menu}
          aria-controls={menuId}
          onClick={() => setMenu(!menu)}
          onKeyDown={openMenuWithKeys}
          className={`ui-btn ui-btn--ghost hidden gap-1 sm:inline-flex ${menu ? 'bg-hover' : ''}`}
        >
          {tr(lang, UI.parts)}
          <ChevronDown className={`h-4 w-4 transition-transform duration-[var(--motion-fast)] ${menu ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 max-w-xl flex-1 lg:block">
          <SearchBox setup={search} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <LinkButton variant="primary" icon={Wrench} href={href.builder} aria-current={current === 'builder' ? 'page' : undefined} className="hidden sm:inline-flex">
            PC Builder
          </LinkButton>
          <span className="hidden items-center gap-0.5 sm:flex">
            <LangSwitch />
            <ThemeSwitch />
          </span>
          <span className="flex items-center sm:hidden">
            <Button variant="ghost" icon={Search} iconOnly onClick={() => setPhoneSearch(true)}>
              {tr(lang, UI.search)}
            </Button>
            <LinkButton variant="ghost" icon={Wrench} iconOnly href={href.builder}>
              PC Builder
            </LinkButton>
            <LinkButton variant="ghost" icon={LayoutGrid} iconOnly href={href.parts}>
              {tr(lang, UI.parts)}
            </LinkButton>
          </span>
        </div>

        {menu && (
          <div className="ui-enter-pop absolute inset-x-4 top-full z-40 mt-1">
            <MegaMenu id={menuId} current={current} counts={counts} onPick={() => setMenu(false)} />
          </div>
        )}
      </div>

      <div className="mx-auto hidden max-w-7xl px-4 pb-3 sm:block lg:hidden">
        <SearchBox setup={search} />
      </div>

      {phoneSearch && (
        <div role="dialog" aria-modal="true" aria-label={tr(lang, UI.search)} className="ui-enter-fade fixed inset-0 z-50 flex flex-col bg-page sm:hidden">
          <div className="flex items-start gap-1 border-b border-line bg-panel p-2">
            <Button variant="ghost" icon={ArrowLeft} iconOnly onClick={() => setPhoneSearch(false)}>
              {tr(lang, UI.back)}
            </Button>
            <div className="min-w-0 flex-1">
              <SearchBox setup={search} variant="panel" autoFocus initialOpen initialQuery={phoneSearchQuery} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
