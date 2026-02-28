/**
 * FinanceIQ v6 — Jotai State Atoms
 * Global state management for security groups, ticker, and layout.
 */
import { atom } from 'jotai';

// ── Security Group System ─────────────────────────────
// Widgets link to groups (A, B, C). Changing ticker in one widget
// broadcasts to all widgets in the same group.
export type SecurityGroup = 'A' | 'B' | 'C';

export const groupTickerAtom = atom<Record<SecurityGroup, string>>({
    A: '',
    B: '',
    C: '',
});

// Active group for the command palette / header
export const activeGroupAtom = atom<SecurityGroup>('A');

// Derived: get current active ticker
export const activeTickerAtom = atom(
    (get) => {
        const group = get(activeGroupAtom);
        return get(groupTickerAtom)[group];
    },
    (get, set, ticker: string) => {
        const group = get(activeGroupAtom);
        set(groupTickerAtom, { ...get(groupTickerAtom), [group]: ticker });
    }
);

// ── UI State ──────────────────────────────────────────
export const commandPaletteOpenAtom = atom(false);
export const sidebarCollapsedAtom = atom(false);
export const aiChatbotOpenAtom = atom(false);

// ── Analysis Data Cache ───────────────────────────────
export const analysisDataAtom = atom<any | null>(null);
export const agentStreamAtom = atom<Array<{ event: string; agent: string; content: string }>>([]);
export const isLoadingAtom = atom(false);
