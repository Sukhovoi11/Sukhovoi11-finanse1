import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_DARK_MODE,
  DEFAULT_MONTHLY_BUDGET_LIMIT,
  DEFAULT_THEME_KEY,
  getTheme,
} from './themes';

const ThemeContext = createContext({
  themeKey: DEFAULT_THEME_KEY,
  darkModeEnabled: DEFAULT_DARK_MODE,
  monthlyBudgetLimit: DEFAULT_MONTHLY_BUDGET_LIMIT,
  notificationsEnabled: true,
  colors: getTheme(),
  setThemePreferences: () => {},
  resetThemePreferences: () => {},
});

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME_KEY);
  const [darkModeEnabled, setDarkModeEnabled] = useState(DEFAULT_DARK_MODE);
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState(DEFAULT_MONTHLY_BUDGET_LIMIT);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const setThemePreferences = useCallback((next = {}) => {
    if (typeof next.themeKey === 'string') {
      setThemeKey(next.themeKey);
    }
    if (typeof next.darkModeEnabled === 'boolean') {
      setDarkModeEnabled(next.darkModeEnabled);
    }
    if (typeof next.monthlyBudgetLimit === 'number' && Number.isFinite(next.monthlyBudgetLimit)) {
      setMonthlyBudgetLimit(next.monthlyBudgetLimit);
    }
    if (typeof next.notificationsEnabled === 'boolean') {
      setNotificationsEnabled(next.notificationsEnabled);
    }
  }, []);

  const resetThemePreferences = useCallback(() => {
    setThemeKey(DEFAULT_THEME_KEY);
    setDarkModeEnabled(DEFAULT_DARK_MODE);
    setMonthlyBudgetLimit(DEFAULT_MONTHLY_BUDGET_LIMIT);
    setNotificationsEnabled(true);
  }, []);

  const colors = useMemo(() => getTheme(themeKey, darkModeEnabled), [darkModeEnabled, themeKey]);

  const value = useMemo(
    () => ({
      themeKey,
      darkModeEnabled,
      monthlyBudgetLimit,
      notificationsEnabled,
      colors,
      setThemePreferences,
      resetThemePreferences,
    }),
    [
      themeKey,
      darkModeEnabled,
      monthlyBudgetLimit,
      notificationsEnabled,
      colors,
      setThemePreferences,
      resetThemePreferences,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
