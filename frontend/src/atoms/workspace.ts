'use client';
import { atom } from 'jotai';

export type WorkspaceView = 'dashboard' | 'contagion' | 'options';

export const activeWorkspaceAtom = atom<WorkspaceView>('dashboard');
