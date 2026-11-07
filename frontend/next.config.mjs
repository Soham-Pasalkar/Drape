import { execSync } from 'node:child_process';

// Commit recorded in AR session files (FR-18); null when git is unavailable.
let appCommit = '';
try {
  appCommit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  appCommit = '';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_COMMIT: appCommit },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

