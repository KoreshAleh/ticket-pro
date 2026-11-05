import { createContext, useContext } from 'react';

export type AppLanguage = 'en' | 'pl' | 'uk' | 'ru';
export type AppTheme = 'dark' | 'light';

export interface PreferencesContextValue {
    language: AppLanguage;
    theme: AppTheme;
    setLanguage: (language: AppLanguage) => void;
    setTheme: (theme: AppTheme) => void;
    t: (text: string) => string;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences() {
    const preferences = useContext(PreferencesContext);
    if (!preferences) throw new Error('usePreferences must be used within PreferencesProvider.');
    return preferences;
}
