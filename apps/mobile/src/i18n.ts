import { getLocales } from 'expo-localization';
import { messages, resolveLocale } from '@pointer/i18n';

export const locale = resolveLocale(getLocales()[0]?.languageTag);
export const t = messages(locale);
