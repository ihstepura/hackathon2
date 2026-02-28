'use client';
/**
 * RightDrawer — Slide-in drawer for tablet breakpoint.
 * Renders children inline on desktop (hidden wrapper), shows as overlay on tablet.
 */
import { useEffect, useRef, useCallback } from 'react';

interface RightDrawerProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function RightDrawer({ open, onClose, children }: RightDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Focus trap + ESC close
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        // Simple focus trap
        if (e.key === 'Tab' && drawerRef.current) {
            const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }, [onClose]);

    useEffect(() => {
        if (open) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            document.addEventListener('keydown', handleKeyDown);
            // Focus the drawer
            setTimeout(() => {
                const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea'
                );
                firstFocusable?.focus();
            }, 100);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus();
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, handleKeyDown]);

    return (
        <div className={`right-drawer-overlay ${open ? 'open' : ''}`} onClick={onClose}>
            <div
                ref={drawerRef}
                className={`right-drawer-panel ${open ? 'open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label="Assistant panel"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="right-drawer-close"
                    onClick={onClose}
                    aria-label="Close panel"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                {children}
            </div>
        </div>
    );
}
