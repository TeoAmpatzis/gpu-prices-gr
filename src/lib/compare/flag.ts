/**
 * The one switch for comparison: its buttons, tray and /compare page. Off in a production build until the owner
 * approves it (flip the default here). `VITE_COMPARE=1` turns it on for a build (e2e, a preview); dev servers have it on.
 */
export const COMPARE_ENABLED: boolean = import.meta.env.VITE_COMPARE === '1' || (import.meta.env.DEV && import.meta.env.VITE_COMPARE !== '0');
