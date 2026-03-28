import { API_BASE_URL } from '@bin/shared';

export function bootWebApp() {
  return {
    app: 'web',
    apiBaseUrl: API_BASE_URL.local,
  };
}

console.log('Bin web workspace scaffolded');
