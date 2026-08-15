import { execSync } from 'node:child_process';

function git(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '*.lhr.life',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    'destinee-unbenignant-shandra.ngrok-free.dev',
  ],
  env: {
    NEXT_PUBLIC_GIT_SHA: git('git rev-parse --short HEAD'),
    NEXT_PUBLIC_GIT_BRANCH: git('git rev-parse --abbrev-ref HEAD'),
  },
};

export default nextConfig;
