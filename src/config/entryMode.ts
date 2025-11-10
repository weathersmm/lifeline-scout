/**
 * Entry Mode Configuration
 * 
 * Determines the deployment context for LifeLine PipeLine Scout.
 * Used to control routing, auth flows, and UI based on subdomain.
 * 
 * Modes:
 * - landing: Shows choice between Internal and Demo (scout.ewproto.com)
 * - internal: Direct to internal dashboard, internal auth only (scout-internal.ewproto.com)
 * - demo: Direct to demo signup/login with mock data (scout-demo.ewproto.com)
 */

export type EntryMode = 'landing' | 'internal' | 'demo';

export const ENTRY_MODE: EntryMode = (import.meta.env.VITE_ENTRY_MODE as EntryMode) || 'landing';

export const isLandingEntry = ENTRY_MODE === 'landing';
export const isInternalEntry = ENTRY_MODE === 'internal';
export const isDemoEntry = ENTRY_MODE === 'demo';
