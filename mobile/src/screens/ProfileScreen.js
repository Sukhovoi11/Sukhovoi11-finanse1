import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, ActivityIndicator } from 'react-native';
import BottomNav from '../components/BottomNav';
import AppButton from '../components/AppButton';
import api from '../api/apiClient';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createProfileStyles } from '../styles';
import {
  DEFAULT_MONTHLY_BUDGET_LIMIT,
  DEFAULT_THEME_KEY,
  THEME_OPTIONS,
} from '../theme/themes';

const HANDLE_REGEX = /^[a-zA-Z0-9._]{3,20}$/;

const EMPTY_PROFILE = {
  email: '',
  username: '',
  displayName: '',
  bio: '',
  notificationsEnabled: true,
  themeKey: DEFAULT_THEME_KEY,
  darkModeEnabled: false,
  monthlyBudgetLimit: String(DEFAULT_MONTHLY_BUDGET_LIMIT),
};

const normalizeProfile = (payload = {}) => {
  const rawUsername = (payload.username || '').toString().trim().toLowerCase();
  const safeUsername = rawUsername.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 20);
  const emailPrefix = (payload.email || '').split('@')[0] || 'user';
  const username = safeUsername || emailPrefix.toLowerCase().replace(/[^a-zA-Z0-9._]/g, '').slice(0, 20);
  const displayName = (payload.displayName || payload.display_name || '').toString().trim() || username;
  const monthlyBudgetLimit = Number(payload.monthlyBudgetLimit || DEFAULT_MONTHLY_BUDGET_LIMIT);

  return {
    email: (payload.email || '').toString(),
    username,
    displayName: displayName.slice(0, 40),
    bio: (payload.bio || '').toString().slice(0, 160),
    notificationsEnabled: payload.notificationsEnabled !== false,
    themeKey: THEME_OPTIONS.some((item) => item.key === payload.themeKey)
      ? payload.themeKey
      : DEFAULT_THEME_KEY,
    darkModeEnabled: payload.darkModeEnabled === true,
    monthlyBudgetLimit:
      Number.isFinite(monthlyBudgetLimit) && monthlyBudgetLimit > 0
        ? String(monthlyBudgetLimit)
        : String(DEFAULT_MONTHLY_BUDGET_LIMIT),
  };
};

export default function ProfileScreen({ navigation, onLogout }) {
  const { colors, setThemePreferences } = useAppTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile/me');
      const normalized = normalizeProfile(res.data || {});
      setProfile(normalized);
      setDraft(normalized);
      setThemePreferences({
        themeKey: normalized.themeKey,
        darkModeEnabled: normalized.darkModeEnabled,
        notificationsEnabled: normalized.notificationsEnabled,
        monthlyBudgetLimit: Number(normalized.monthlyBudgetLimit),
      });
    } catch (err) {
      console.log('ERR PROFILE LOAD:', err?.response?.data || err.message);
      notify('Blad', 'Nie udalo sie pobrac ustawien profilu.');
    } finally {
      setLoading(false);
    }
  }, [setThemePreferences]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProfile);
    loadProfile();
    return unsubscribe;
  }, [navigation, loadProfile]);

  const hasChanges = useMemo(
    () =>
      profile.username !== draft.username ||
      profile.displayName !== draft.displayName ||
      profile.bio !== draft.bio ||
      profile.notificationsEnabled !== draft.notificationsEnabled ||
      profile.themeKey !== draft.themeKey ||
      profile.darkModeEnabled !== draft.darkModeEnabled ||
      profile.monthlyBudgetLimit !== draft.monthlyBudgetLimit,
    [profile, draft]
  );

  const syncThemeContext = useCallback(
    (nextDraft) => {
      const parsedLimit = Number(nextDraft.monthlyBudgetLimit);
      setThemePreferences({
        themeKey: nextDraft.themeKey,
        darkModeEnabled: nextDraft.darkModeEnabled,
        notificationsEnabled: nextDraft.notificationsEnabled,
        monthlyBudgetLimit:
          Number.isFinite(parsedLimit) && parsedLimit > 0
            ? parsedLimit
            : Number(profile.monthlyBudgetLimit || DEFAULT_MONTHLY_BUDGET_LIMIT),
      });
    },
    [profile.monthlyBudgetLimit, setThemePreferences]
  );

  const onDraftChange = (key, value) => {
    setDraft((prev) => {
      const nextDraft = { ...prev, [key]: value };
      if (
        key === 'themeKey' ||
        key === 'darkModeEnabled' ||
        key === 'notificationsEnabled' ||
        key === 'monthlyBudgetLimit'
      ) {
        syncThemeContext(nextDraft);
      }
      return nextDraft;
    });
  };

  useEffect(() => {
    const themeChanged =
      profile.themeKey !== draft.themeKey ||
      profile.darkModeEnabled !== draft.darkModeEnabled ||
      profile.notificationsEnabled !== draft.notificationsEnabled ||
      profile.monthlyBudgetLimit !== draft.monthlyBudgetLimit;

    if (loading || !profile.email || !themeChanged) {
      return undefined;
    }

    const parsedLimit = Number(draft.monthlyBudgetLimit);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 100) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setPrefsSaving(true);
        const res = await api.put('/profile/me', {
          themeKey: draft.themeKey,
          darkModeEnabled: draft.darkModeEnabled,
          notificationsEnabled: draft.notificationsEnabled,
          monthlyBudgetLimit: parsedLimit,
        });

        if (cancelled) return;
        const normalized = normalizeProfile(res.data || draft);

        setProfile((prev) => ({
          ...prev,
          themeKey: normalized.themeKey,
          darkModeEnabled: normalized.darkModeEnabled,
          notificationsEnabled: normalized.notificationsEnabled,
          monthlyBudgetLimit: normalized.monthlyBudgetLimit,
        }));
        setDraft((prev) => ({
          ...prev,
          themeKey: normalized.themeKey,
          darkModeEnabled: normalized.darkModeEnabled,
          notificationsEnabled: normalized.notificationsEnabled,
          monthlyBudgetLimit: normalized.monthlyBudgetLimit,
        }));
        syncThemeContext(normalized);
      } catch (err) {
        if (cancelled) return;
        console.log('ERR PROFILE PREFS AUTO-SAVE:', err?.response?.data || err.message);
        notify('Blad', err?.response?.data?.message || 'Nie udalo sie zapisac ustawien wygladu.');
        syncThemeContext(profile);
        setDraft((prev) => ({
          ...prev,
          themeKey: profile.themeKey,
          darkModeEnabled: profile.darkModeEnabled,
          notificationsEnabled: profile.notificationsEnabled,
          monthlyBudgetLimit: profile.monthlyBudgetLimit,
        }));
      } finally {
        if (!cancelled) {
          setPrefsSaving(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    draft.darkModeEnabled,
    draft.monthlyBudgetLimit,
    draft.notificationsEnabled,
    draft.themeKey,
    loading,
    profile,
    syncThemeContext,
  ]);

  const handleSaveProfile = async () => {
    if (!hasChanges) {
      return notify('Info', 'Nie masz nowych zmian do zapisania.');
    }

    const username = draft.username.trim().toLowerCase();
    const displayName = draft.displayName.trim();
    const bio = draft.bio.trim();
    const monthlyBudgetLimit = Number(draft.monthlyBudgetLimit);

    if (!HANDLE_REGEX.test(username)) {
      return notify(
        'Blad',
        'Nick musi miec 3-20 znakow i moze zawierac tylko litery, cyfry, kropke oraz podkreslenie.'
      );
    }
    if (!displayName) {
      return notify('Blad', 'Wpisz wyswietlana nazwe profilu.');
    }
    if (bio.length > 160) {
      return notify('Blad', 'Bio moze miec maksymalnie 160 znakow.');
    }
    if (!Number.isFinite(monthlyBudgetLimit) || monthlyBudgetLimit < 100) {
      return notify('Blad', 'Miesieczny limit musi byc liczba >= 100.');
    }

    try {
      setSaving(true);
      const res = await api.put('/profile/me', {
        username,
        displayName,
        bio,
        notificationsEnabled: draft.notificationsEnabled,
        themeKey: draft.themeKey,
        darkModeEnabled: draft.darkModeEnabled,
        monthlyBudgetLimit,
      });

      const normalized = normalizeProfile(res.data || draft);
      setProfile(normalized);
      setDraft(normalized);
      setThemePreferences({
        themeKey: normalized.themeKey,
        darkModeEnabled: normalized.darkModeEnabled,
        notificationsEnabled: normalized.notificationsEnabled,
        monthlyBudgetLimit: Number(normalized.monthlyBudgetLimit),
      });
      notify('Sukces', 'Profil zostal zaktualizowany.');
    } catch (err) {
      console.log('ERR PROFILE SAVE:', err?.response?.data || err.message);
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie zapisac zmian.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      return notify('Blad', 'Wypelnij aktualne i nowe haslo.');
    }
    if (passwordForm.newPassword.length < 6) {
      return notify('Blad', 'Nowe haslo musi miec przynajmniej 6 znakow.');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return notify('Blad', 'Hasla nie sa takie same.');
    }

    try {
      setPasswordSaving(true);
      await api.put('/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify('Sukces', 'Haslo zostalo zmienione.');
    } catch (err) {
      console.log('ERR PASSWORD CHANGE:', err?.response?.data || err.message);
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie zmienic hasla.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const avatarText = (draft.displayName || draft.username || 'F')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <Text style={styles.title}>Profil i ustawienia</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
          <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
          <View style={styles.heroAvatarRing}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{avatarText}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>@{draft.username || 'user'}</Text>
          <Text style={styles.heroEmail}>{draft.email || 'konto@finanseplus.app'}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Laduje dane profilu...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Publiczny profil</Text>
              <Text style={styles.fieldLabel}>Nick (@username)</Text>
              <TextInput
                style={styles.input}
                value={draft.username}
                onChangeText={(value) => onDraftChange('username', value.toLowerCase())}
                autoCapitalize="none"
                placeholder="twoj.nick"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>Nazwa wyswietlana</Text>
              <TextInput
                style={styles.input}
                value={draft.displayName}
                onChangeText={(value) => onDraftChange('displayName', value)}
                placeholder="Twoje imie"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={draft.bio}
                onChangeText={(value) => onDraftChange('bio', value)}
                placeholder="Napisz cos o sobie..."
                placeholderTextColor={colors.muted}
                multiline
                maxLength={160}
              />
              <Text style={styles.counterText}>{draft.bio.length}/160</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wyglad i planowanie</Text>
              <Text style={styles.sectionHint}>
                Zmiany motywu i trybu nocnego zapisuja sie automatycznie.
              </Text>

              <Text style={styles.fieldLabel}>Motyw aplikacji</Text>
              <View style={styles.themeRow}>
                {THEME_OPTIONS.map((item) => {
                  const selected = draft.themeKey === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.themeChip, selected && styles.themeChipSelected]}
                      onPress={() => onDraftChange('themeKey', item.key)}
                    >
                      <Text style={[styles.themeChipText, selected && styles.themeChipTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Miesieczny limit budzetu (PLN)</Text>
              <TextInput
                style={styles.input}
                value={draft.monthlyBudgetLimit}
                keyboardType="numeric"
                onChangeText={(value) => onDraftChange('monthlyBudgetLimit', value.replace(/[^0-9.]/g, ''))}
                placeholder="2500"
                placeholderTextColor={colors.muted}
              />
              {prefsSaving ? <Text style={styles.autosaveText}>Zapisywanie ustawien...</Text> : null}

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Tryb nocny</Text>
                  <Text style={styles.toggleMeta}>Przelacz jasny/ciemny wyglad aplikacji</Text>
                </View>
                <Switch
                  value={draft.darkModeEnabled}
                  onValueChange={(value) => onDraftChange('darkModeEnabled', value)}
                  trackColor={{ false: '#D1D5DB', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Powiadomienia</Text>
                  <Text style={styles.toggleMeta}>Pokazuj in-app komunikaty o operacjach</Text>
                </View>
                <Switch
                  value={draft.notificationsEnabled}
                  onValueChange={(value) => onDraftChange('notificationsEnabled', value)}
                  trackColor={{ false: '#D1D5DB', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Szybki dostep</Text>
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Portfolio')}>
                <Text style={styles.rowTitle}>Portfele i konta</Text>
                <Text style={styles.rowMeta}>Saldo i waluty</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('History')}>
                <Text style={styles.rowTitle}>Historia operacji</Text>
                <Text style={styles.rowMeta}>Pelna lista transakcji</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Goals')}>
                <Text style={styles.rowTitle}>Cele i budzet</Text>
                <Text style={styles.rowMeta}>Kontroluj plan</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bezpieczenstwo</Text>
              <Text style={styles.fieldLabel}>Aktualne haslo</Text>
              <TextInput
                style={styles.input}
                value={passwordForm.currentPassword}
                onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                secureTextEntry
                placeholder="Wpisz aktualne haslo"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>Nowe haslo</Text>
              <TextInput
                style={styles.input}
                value={passwordForm.newPassword}
                onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                secureTextEntry
                placeholder="Minimum 6 znakow"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>Potwierdz nowe haslo</Text>
              <TextInput
                style={styles.input}
                value={passwordForm.confirmPassword}
                onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
                secureTextEntry
                placeholder="Powtorz nowe haslo"
                placeholderTextColor={colors.muted}
              />

              <AppButton
                title={passwordSaving ? 'Zmiana hasla...' : 'Zmien haslo'}
                onPress={handlePasswordChange}
                style={styles.secondaryButton}
              />
            </View>
          </>
        )}

        <AppButton
          title={saving ? 'Zapisywanie...' : hasChanges ? 'Zapisz zmiany' : 'Brak zmian'}
          onPress={handleSaveProfile}
          style={hasChanges ? undefined : styles.disabledButton}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Wyloguj sie</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav navigation={navigation} activeRoute="Profile" />
    </View>
  );
}
