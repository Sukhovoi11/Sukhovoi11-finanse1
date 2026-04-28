import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import api from '../api/apiClient';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createGoalsStyles } from '../styles';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} PLN`;

export default function GoalsScreen() {
  const { colors, monthlyBudgetLimit } = useAppTheme();
  const styles = useMemo(() => createGoalsStyles(colors), [colors]);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDueDate, setGoalDueDate] = useState('');
  const [contributionInputs, setContributionInputs] = useState({});
  const [deletingGoalId, setDeletingGoalId] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions/history');
      setHistory(res.data || []);
    } catch (err) {
      console.log('ERR HISTORY (insights):', err?.response?.data || err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGoals = useCallback(async () => {
    try {
      setGoalsLoading(true);
      const res = await api.get('/goals');
      setGoals(res.data || []);
    } catch (err) {
      console.log('ERR GOALS:', err?.response?.data || err.message);
      setGoals([]);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadHistory(), loadGoals()]);
  }, [loadHistory, loadGoals]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleCreateGoal = async () => {
    const targetValue = parseFloat(String(goalTarget || '').replace(',', '.'));
    if (!goalTitle || !targetValue || targetValue <= 0) {
      return notify('Blad', 'Podaj nazwe celu i poprawna kwote.');
    }

    try {
      await api.post('/goals', {
        title: goalTitle,
        targetAmount: targetValue,
        dueDate: goalDueDate || null,
      });
      setGoalTitle('');
      setGoalTarget('');
      setGoalDueDate('');
      await loadGoals();
      notify('Sukces', 'Cel zostal dodany.');
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie zapisac celu.');
    }
  };

  const handleContribution = async (goalId) => {
    const value = parseFloat(String(contributionInputs[goalId] || '').replace(',', '.'));
    if (!value || value <= 0) {
      return notify('Blad', 'Podaj poprawna kwote.');
    }
    try {
      await api.post(`/goals/${goalId}/contribute`, { amount: value });
      setContributionInputs((prev) => ({ ...prev, [goalId]: '' }));
      await refreshAll();
      notify('Sukces', 'Srodki zostaly odlozone.');
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie odlozyc srodkow.');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      setDeletingGoalId(goalId);
      await api.delete(`/goals/${goalId}`);
      await refreshAll();
      notify('Sukces', 'Cel zostal usuniety.');
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie usunac celu.');
    } finally {
      setDeletingGoalId(null);
    }
  };

  const summary = useMemo(() => {
    const expenses = history.filter((item) => item.type === 'EXPENSE');
    const income = history.filter((item) => item.type === 'INCOME');
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalIncome = income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const safeBudget = Number(monthlyBudgetLimit || 2500);
    const budgetProgress = safeBudget > 0 ? Math.min(totalExpenses / safeBudget, 1) : 0;
    const safePercent = Math.round((budgetProgress || 0) * 100);

    return {
      totalExpenses,
      totalIncome,
      remaining: Math.max(safeBudget - totalExpenses, 0),
      budgetProgress,
      safePercent,
      cashflow: totalIncome - totalExpenses,
      safeBudget,
    };
  }, [history, monthlyBudgetLimit]);

  const tips = useMemo(() => {
    const result = [];

    if (summary.cashflow < 0) {
      result.push('Masz ujemny cashflow - ogranicz koszty stale i rozrywke.');
    } else {
      result.push('Cashflow dodatni - swietnie, odkładaj nadwyzke automatycznie.');
    }

    if (summary.safePercent > 85) {
      result.push('Budzet jest blisko limitu. W tym tygodniu trzymaj niski poziom wydatkow.');
    } else {
      result.push('Budzet miesieczny jest pod kontrola. Kontynuuj ten rytm.');
    }

    if (!goals.length) {
      result.push('Dodaj pierwszy cel oszczednosciowy i ustaw termin realizacji.');
    } else {
      result.push('Masz aktywne cele - regularnie zasilaj je malymi kwotami.');
    }

    return result;
  }, [goals.length, summary.cashflow, summary.safePercent]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
        <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
        <Text style={styles.heroCaption}>Cele i budzet</Text>
        <Text style={styles.heroTitle}>Twoj plan finansowy</Text>
        <Text style={styles.heroMeta}>Miesieczny limit: {summary.safeBudget} PLN</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${summary.budgetProgress * 100}%` }]} />
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatLabel}>Wydatki</Text>
            <Text style={styles.heroStatValue}>{formatMoney(summary.totalExpenses)}</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatLabel}>Pozostalo</Text>
            <Text style={styles.heroStatValue}>{formatMoney(summary.remaining)}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loadingText}>Laduje podsumowanie...</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cashflow</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Przychody</Text>
              <Text style={styles.rowValue}>{formatMoney(summary.totalIncome)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Wydatki</Text>
              <Text style={styles.rowValue}>{formatMoney(summary.totalExpenses)}</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>Bilans</Text>
              <Text
                style={[
                  styles.rowValue,
                  summary.cashflow < 0 ? styles.negativeValue : styles.positiveValue,
                ]}
              >
                {formatMoney(summary.cashflow)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Szybkie rekomendacje</Text>
            {tips.map((tip, index) => (
              <View key={`${tip}-${index}`} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nowy cel oszczednosciowy</Text>
        <TextInput
          style={styles.input}
          placeholder="Np. Wakacje, nowy laptop"
          placeholderTextColor={colors.muted}
          value={goalTitle}
          onChangeText={setGoalTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Kwota docelowa (PLN)"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={goalTarget}
          onChangeText={(value) => setGoalTarget(value.replace(/[^0-9.,]/g, ''))}
        />
        <TextInput
          style={styles.input}
          placeholder="Termin (YYYY-MM-DD)"
          placeholderTextColor={colors.muted}
          value={goalDueDate}
          onChangeText={setGoalDueDate}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateGoal}>
          <Text style={styles.primaryButtonText}>Dodaj cel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Twoje cele</Text>
          {goalsLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {!goals.length ? (
          <Text style={styles.emptyText}>Brak celow. Dodaj pierwszy plan oszczedzania.</Text>
        ) : (
          goals.map((goal) => {
            const progress = goal.target_amount
              ? Math.min(Number(goal.saved_amount || 0) / Number(goal.target_amount || 0), 1)
              : 0;

            return (
              <View key={goal.goal_id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalMeta}>
                      {goal.due_date ? `Termin: ${goal.due_date}` : 'Bez terminu'}
                    </Text>
                  </View>
                  <View style={styles.goalHeaderRight}>
                    <Text style={styles.goalPercent}>{Math.round(progress * 100)}%</Text>
                    <TouchableOpacity
                      style={styles.deleteGoalButton}
                      onPress={() => handleDeleteGoal(goal.goal_id)}
                      disabled={deletingGoalId === goal.goal_id}
                    >
                      <Text style={styles.deleteGoalButtonText}>
                        {deletingGoalId === goal.goal_id ? 'Usuwanie...' : 'Usun'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.goalProgressTrack}>
                  <View style={[styles.goalProgressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.goalAmount}>
                  {formatMoney(goal.saved_amount)} / {formatMoney(goal.target_amount)}
                </Text>

                <View style={styles.contributionRow}>
                  <TextInput
                    style={[styles.input, styles.contributionInput]}
                    placeholder="Kwota do odlozenia"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    value={contributionInputs[goal.goal_id] || ''}
                    onChangeText={(text) =>
                      setContributionInputs((prev) => ({
                        ...prev,
                        [goal.goal_id]: text.replace(/[^0-9.,]/g, ''),
                      }))
                    }
                  />
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleContribution(goal.goal_id)}
                  >
                    <Text style={styles.secondaryButtonText}>Odloz</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
