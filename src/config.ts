/**
 * Application Configuration
 * Centralized configuration for the application
 */

// Resolve the backend API port:
// 1. In Docker, VITE_API_BASE_URL is set (e.g. "http://localhost:5000") via docker-compose.
// 2. In local dev, it falls back to port 8080 (matching backend/.env BACKEND_PORT=8080).
const VITE_API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '';

// Dynamic API URL for local development to allow access from other devices
export const getApiUrl = (): string => {
    if (VITE_API_BASE) {
        // Docker / explicit env var — use it directly, appending /api if needed
        return VITE_API_BASE.endsWith('/api') ? VITE_API_BASE : `${VITE_API_BASE}/api`;
    }
    // Local dev fallback — construct from current hostname + backend port
    const hostname = window.location.hostname;
    return `http://${hostname}:8080/api`;
};

// Base URL for media assets (images, videos)
export const getMediaUrl = (fileId: string): string => {
    if (!fileId) return '';

    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // If fileId is already a full URL
    if (fileId.startsWith('http')) {
        // If we're accessing from a non-localhost device (e.g., mobile),
        // rewrite localhost/127.0.0.1 in the URL to the current hostname
        if (!isLocalhost && (fileId.includes('localhost') || fileId.includes('127.0.0.1'))) {
            return fileId
                .replace('localhost', hostname)
                .replace('127.0.0.1', hostname);
        }
        return fileId;
    }

    // If it's a relative path or ID, construct the full URL using same base
    return `${API_BASE_URL}/media/${fileId}`;
};

export const API_BASE_URL = getApiUrl();
export const BASE_URL = API_BASE_URL.replace('/api', '');

/**
 * Rewrite any URL that contains localhost or 127.0.0.1 to use the current hostname.
 * This ensures URLs stored in the database work when accessed from mobile devices.
 */
export const rewriteUrl = (url: string | undefined | null): string => {
    if (!url || typeof url !== 'string') return '';
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return url;
    return url
        .replace(/http:\/\/localhost/g, `http://${hostname}`)
        .replace(/http:\/\/127\.0\.0\.1/g, `http://${hostname}`);
};
