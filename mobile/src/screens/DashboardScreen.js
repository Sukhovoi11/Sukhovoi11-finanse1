import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api/apiClient';
import BottomNav from '../components/BottomNav';
import { useAppTheme } from '../theme/ThemeContext';
import { createDashboardStyles } from '../styles';

const TX_LABELS = {
  INCOME: 'Przychod',
  EXPENSE: 'Wydatek',
  BUY: 'Zakup',
  SELL: 'Sprzedaz',
  SAVING: 'Oszczedzanie',
};

const TX_COLORS = {
  INCOME: '#16A34A',
  EXPENSE: '#E11D48',
  BUY: '#2563EB',
  SELL: '#7C3AED',
  SAVING: '#EA580C',
};

export default function DashboardScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createDashboardStyles(colors), [colors]);

  const quickActions = useMemo(
    () => [
      { route: 'Income', title: 'Przychod', subtitle: 'Dodaj srodki', color: colors.primarySoft },
      { route: 'Expenses', title: 'Wydatek', subtitle: 'Nowa operacja', color: colors.surfaceMuted },
      { route: 'Goals', title: 'Cele', subtitle: 'Plan budzetu', color: colors.primarySoft },
      { route: 'Reminders', title: 'Reminder', subtitle: 'Platnosci', color: colors.surfaceMuted },
      { route: 'Leaderboard', title: 'Ranking', subtitle: 'Statystyki userow', color: colors.primarySoft },
    ],
    [colors.primarySoft, colors.surfaceMuted]
  );

  const [loading, setLoading] = useState(false);
  const [plnBalance, setPlnBalance] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [transactionsCount, setTransactionsCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [profileUsername, setProfileUsername] = useState('user');
  const [profileAvatarText, setProfileAvatarText] = useState('F');

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [portfolioRes, historyRes, profileRes] = await Promise.all([
        api.get('/wallet/portfolio'),
        api.get('/transactions/history'),
        api.get('/profile/me').catch(() => ({ data: null })),
      ]);

      const portfolio = portfolioRes.data || [];
      const history = historyRes.data || [];
      const profile = profileRes?.data || {};
      const expenses = history.filter((item) => item.type === 'EXPENSE');
      const pln = portfolio.find((item) => item.currency_code === 'PLN')?.amount ?? 0;
      const expenseSum = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const username = String(profile.username || profile.displayName || 'user')
        .trim()
        .toLowerCase();
      const avatarText = String(profile.displayName || profile.username || 'Finanse')
        .trim()
        .slice(0, 2)
        .toUpperCase();

      setPlnBalance(pln);
      setExpenseTotal(expenseSum);
      setTransactionsCount(history.length);
      setExpenseCount(expenses.length);
      setRecentTransactions(history.slice(0, 4));
      setProfileUsername(username || 'user');
      setProfileAvatarText(avatarText || 'F');
    } catch (err) {
      console.log('ERR DASHBOARD SUMMARY:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadSummary);
    loadSummary();
    return unsubscribe;
  }, [navigation, loadSummary]);

  const averageExpense = useMemo(() => {
    if (!expenseCount) return 0;
    return expenseTotal / expenseCount;
  }, [expenseCount, expenseTotal]);

  const formatAmount = (value) => `${Number(value || 0).toFixed(2)} PLN`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>Twoj feed finansowy</Text>
            <Text style={styles.brandTitle}>Finanse+</Text>
            <Text style={styles.profileHandle}>@{profileUsername}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.9}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{profileAvatarText}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => navigation.navigate('Portfolio')}
          activeOpacity={0.9}
        >
          <View style={[styles.heroGlowLeft, { backgroundColor: colors.secondary }]} />
          <View style={[styles.heroGlowRight, { backgroundColor: colors.accent }]} />
          <Text style={styles.heroCaption}>Saldo glowne</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 10 }} />
          ) : (
            <Text style={styles.heroAmount}>{formatAmount(plnBalance)}</Text>
          )}
          <Text style={styles.heroHint}>Tapnij, aby przejsc do portfeli i kont</Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>Operacje</Text>
              <Text style={styles.heroPillValue}>{transactionsCount}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>Wydatki</Text>
              <Text style={styles.heroPillValue}>{formatAmount(expenseTotal)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Szybkie akcje</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.route}
              style={[styles.quickCard, { backgroundColor: action.color }]}
              onPress={() => navigation.navigate(action.route)}
              activeOpacity={0.9}
            >
              <Text style={styles.quickCardTitle}>{action.title}</Text>
              <Text style={styles.quickCardSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.snapshotRow}>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotLabel}>Sredni wydatek</Text>
            <Text style={styles.snapshotValue}>{formatAmount(averageExpense)}</Text>
          </View>
          <TouchableOpacity
            style={styles.snapshotCard}
            onPress={() => navigation.navigate('CategoryStats')}
            activeOpacity={0.9}
          >
            <Text style={styles.snapshotLabel}>Statystyki</Text>
            <Text style={styles.snapshotValue}>{transactionsCount}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ostatnie operacje</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.sectionLink}>Zobacz wszystko</Text>
          </TouchableOpacity>
        </View>

        {!recentTransactions.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Brak operacji</Text>
            <Text style={styles.emptyText}>
              Dodaj pierwszy przychod lub wydatek, a feed od razu sie zapelni.
            </Text>
          </View>
        ) : (
          recentTransactions.map((item) => (
            <TouchableOpacity
              key={item.transaction_id}
              style={styles.transactionCard}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.9}
            >
              <View style={[styles.dot, { backgroundColor: TX_COLORS[item.type] || '#6B7280' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionTitle}>{TX_LABELS[item.type] || item.type}</Text>
                <Text style={styles.transactionMeta}>
                  {item.currency_from || '-'} -> {item.currency_to || '-'}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>{formatAmount(item.amount)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <BottomNav navigation={navigation} activeRoute="Dashboard" />
    </View>
  );
}
