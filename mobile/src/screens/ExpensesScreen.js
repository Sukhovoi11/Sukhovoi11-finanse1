import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import api from '../api/apiClient';
import AppButton from '../components/AppButton';
import BottomNav from '../components/BottomNav';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createExpensesStyles } from '../styles';

const EXPENSE_CATEGORIES = [
  { key: 'TRANSPORT', label: 'Transport' },
  { key: 'JEDZENIE', label: 'Jedzenie' },
  { key: 'MIESZKANIE', label: 'Mieszkanie' },
  { key: 'ZDROWIE', label: 'Zdrowie' },
  { key: 'ROZRYWKA', label: 'Rozrywka' },
  { key: 'INNE', label: 'Inne' },
];

const ADD_CUSTOM_CATEGORY_KEY = '__ADD_CUSTOM__';
const BASE_CATEGORY_KEYS = EXPENSE_CATEGORIES.map((item) => item.key);

const parseAmount = (rawValue) => {
  const normalized = String(rawValue || '').trim().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const normalizeCategoryKey = (rawValue = '') =>
  String(rawValue || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase()
    .slice(0, 24);

const formatCategoryLabel = (key) => {
  const defaultItem = EXPENSE_CATEGORIES.find((item) => item.key === key);
  if (defaultItem) return defaultItem.label;

  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const sanitizeCustomCategories = (source = []) => {
  const seen = new Set();
  const output = [];

  source.forEach((item) => {
    const normalized = normalizeCategoryKey(item);
    if (!normalized || normalized.length < 2) return;
    if (BASE_CATEGORY_KEYS.includes(normalized)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });

  return output;
};

export default function ExpensesScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createExpensesStyles(colors), [colors]);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].key);
  const [customCategory, setCustomCategory] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoadingPortfolio(true);
      const [portfolioRes, profileRes] = await Promise.all([
        api.get('/wallet/portfolio'),
        api.get('/profile/me').catch(() => ({ data: {} })),
      ]);

      setPortfolio(portfolioRes.data || []);
      setCustomCategories(sanitizeCustomCategories(profileRes?.data?.expenseCategories || []));
    } catch (err) {
      console.log('ERR TRADE LOAD:', err?.response?.data || err.message);
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    loadData();
    return unsubscribe;
  }, [navigation, loadData]);

  const plnBalance = portfolio.find((p) => p.currency_code === 'PLN')?.amount ?? 0;

  const categoriesWithCustom = useMemo(
    () => [
      ...EXPENSE_CATEGORIES,
      ...customCategories.map((key) => ({ key, label: formatCategoryLabel(key) || key })),
      { key: ADD_CUSTOM_CATEGORY_KEY, label: 'Swoja +' },
    ],
    [customCategories]
  );

  const persistCustomCategories = useCallback(async (nextCategories, successMessage) => {
    setSavingCategory(true);
    try {
      const cleaned = sanitizeCustomCategories(nextCategories);
      await api.put('/profile/me', { expenseCategories: cleaned });
      setCustomCategories(cleaned);
      if (successMessage) {
        notify('Sukces', successMessage);
      }
      return cleaned;
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie zapisac kategorii.');
      return null;
    } finally {
      setSavingCategory(false);
    }
  }, []);

  const handleSaveCustomCategory = async () => {
    const normalized = normalizeCategoryKey(customCategory);
    if (!normalized || normalized.length < 2) {
      return notify('Blad', 'Nazwa kategorii musi miec minimum 2 znaki.');
    }

    if (BASE_CATEGORY_KEYS.includes(normalized) || customCategories.includes(normalized)) {
      setCategory(normalized);
      return notify('Info', 'Ta kategoria juz istnieje.');
    }

    const next = [...customCategories, normalized];
    const saved = await persistCustomCategories(next, 'Kategoria zostala dodana.');
    if (saved) {
      setCategory(normalized);
      setCustomCategory('');
    }
  };

  const handleDeleteCategory = async (categoryKey) => {
    const normalizedKey = normalizeCategoryKey(categoryKey);
    if (!normalizedKey || BASE_CATEGORY_KEYS.includes(normalizedKey)) return;

    const next = customCategories.filter((item) => item !== normalizedKey);
    const saved = await persistCustomCategories(next, 'Kategoria zostala usunieta.');
    if (saved && category === normalizedKey) {
      setCategory(EXPENSE_CATEGORIES[0].key);
    }
  };

  const handleSubmit = async () => {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return notify('Blad', 'Podaj poprawna kwote wieksza od 0.');
    }

    const typedCustom = normalizeCategoryKey(customCategory);
    const resolvedCategory = category === ADD_CUSTOM_CATEGORY_KEY ? typedCustom : category;

    if (!resolvedCategory || resolvedCategory.length < 2) {
      return notify('Blad', 'Wpisz nazwe swojej kategorii.');
    }

    try {
      const payload = {
        category: resolvedCategory,
        amountPln: Number(value.toFixed(2)),
      };

      const res = await api.post('/transactions/expense', payload);
      notify('Sukces', `Wydatek zapisany: ${Number(res.data.amountPln || value).toFixed(2)} PLN`);

      if (
        category === ADD_CUSTOM_CATEGORY_KEY &&
        !BASE_CATEGORY_KEYS.includes(resolvedCategory) &&
        !customCategories.includes(resolvedCategory)
      ) {
        await persistCustomCategories([...customCategories, resolvedCategory]);
      }

      setAmount('');
      if (category === ADD_CUSTOM_CATEGORY_KEY) {
        setCustomCategory('');
      }
      await loadData();
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie zapisac wydatku.');
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
              <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
              <Text style={styles.heroCaption}>Wydatki</Text>
              <Text style={styles.heroTitle}>Dodaj operacje</Text>
              <Text style={styles.heroMeta}>Wybierz kategorie i kontroluj budzet.</Text>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillLabel}>Dostepne srodki</Text>
                {loadingPortfolio ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 6 }} />
                ) : (
                  <Text style={styles.heroPillValue}>{plnBalance.toFixed(2)} PLN</Text>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Kwota wydatku (PLN)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={(value) => setAmount(value.replace(/[^0-9.,]/g, ''))}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.fieldLabel}>Kategoria wydatku</Text>
              <View style={styles.categoryGrid}>
                {categoriesWithCustom.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.chip, category === item.key && styles.chipSelected]}
                    onPress={() => setCategory(item.key)}
                  >
                    <Text style={[styles.chipText, category === item.key && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {customCategories.length ? (
                <View style={styles.customManageBlock}>
                  <Text style={styles.customManageLabel}>Zarzadzaj swoimi kategoriami</Text>
                  <View style={styles.customManageList}>
                    {customCategories.map((item) => (
                      <View key={item} style={styles.customManageRow}>
                        <TouchableOpacity
                          style={styles.customManageSelect}
                          onPress={() => setCategory(item)}
                        >
                          <Text style={styles.customManageText}>{formatCategoryLabel(item) || item}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.customManageDelete}
                          onPress={() => handleDeleteCategory(item)}
                          disabled={savingCategory}
                        >
                          <Text style={styles.customManageDeleteText}>Usun</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {category === ADD_CUSTOM_CATEGORY_KEY ? (
                <View>
                  <TextInput
                    style={[styles.input, styles.customCategoryInput]}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="Wpisz swoja kategorie"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    style={[styles.saveCategoryButton, savingCategory && styles.disabledButton]}
                    onPress={handleSaveCustomCategory}
                    disabled={savingCategory}
                  >
                    <Text style={styles.saveCategoryText}>
                      {savingCategory ? 'Zapisywanie...' : 'Zapisz kategorie'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <AppButton title="Dodaj wydatek" onPress={handleSubmit} />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <BottomNav navigation={navigation} activeRoute="Expenses" />
    </View>
  );
}
