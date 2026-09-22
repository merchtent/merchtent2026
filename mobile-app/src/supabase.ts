import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Set the public Supabase URL and anon key in mobile-app/.env');

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL || '').replace(/\/$/, '');

export function productImage(path: string | null | undefined) {
  if (!path) return null;
  return `${url}/storage/v1/object/public/product-images/${path.split('/').map(encodeURIComponent).join('/')}`;
}
