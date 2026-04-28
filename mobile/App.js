import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import api, { setAuthToken } from './src/api/apiClient';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';
import {
  DEFAULT_MONTHLY_BUDGET_LIMIT,
  DEFAULT_THEME_KEY,
} from './src/theme/themes';
import AppToastHost from './src/components/AppToastHost';

function AppRoot() {
  const [token, setToken] = useState(null);
  const { setThemePreferences, resetThemePreferences } = useAppTheme();

  const applyProfilePreferences = useCallback(
    async (authToken) => {
      if (!authToken) return;
      try {
        const res = await api.get('/profile/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const payload = res.data || {};
        setThemePreferences({
          themeKey: payload.themeKey || DEFAULT_THEME_KEY,
          darkModeEnabled: payload.darkModeEnabled === true,
          notificationsEnabled: payload.notificationsEnabled !== false,
          monthlyBudgetLimit:
            Number(payload.monthlyBudgetLimit) > 0
              ? Number(payload.monthlyBudgetLimit)
              : DEFAULT_MONTHLY_BUDGET_LIMIT,
        });
      } catch (err) {
        console.log('ERR PROFILE PREFS LOAD:', err?.response?.data || err.message);
      }
    },
    [setThemePreferences]
  );

  const handleLogin = async (newToken) => {
    setToken(newToken);
    setAuthToken(newToken);
    await applyProfilePreferences(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setAuthToken(null);
    resetThemePreferences();
  };

  useEffect(() => {
    if (token) {
      applyProfilePreferences(token);
    }
  }, [token, applyProfilePreferences]);

  return (
    <AppNavigator
      isLoggedIn={!!token}
      onLogin={handleLogin}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <AppRoot />
        <AppToastHost />
      </View>
    </ThemeProvider>
  );
}
