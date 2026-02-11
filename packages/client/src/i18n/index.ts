import { createI18n } from 'vue-i18n';
import zh from './zh.json';
import en from './en.json';

export type MessageSchema = typeof zh;

const i18n = createI18n<[MessageSchema], 'zh' | 'en'>({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages: {
    zh,
    en,
  },
});

export default i18n;
