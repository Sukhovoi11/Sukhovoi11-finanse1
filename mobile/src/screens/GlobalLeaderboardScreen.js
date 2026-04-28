import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api/apiClient';
import { useAppTheme } from '../theme/ThemeContext';
import { createLeaderboardStyles } from '../styles';

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} PLN`;

export default function GlobalLeaderboardScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createLeaderboardStyles(colors), [colors]);

  const [metric, setMetric] = useState('expenses');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/stats/leaderboard?metric=${metric}`);
      setRows(res.data?.leaderboard || []);
    } catch (err) {
      console.log('ERR LEADERBOARD:', err?.response?.data || err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const topUser = rows[0];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
        <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
        <Text style={styles.heroCaption}>Spolecznosc</Text>
        <Text style={styles.heroTitle}>Ranking finansowy</Text>
        <Text style={styles.heroMeta}>
          Podglad wydatkow i przychodow aktywnych userow.
        </Text>

        {topUser ? (
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Lider</Text>
            <Text style={styles.heroPillValue}>@{topUser.username}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metricRow}>
        <TouchableOpacity
          style={[styles.metricChip, metric === 'expenses' && styles.metricChipActive]}
          onPress={() => setMetric('expenses')}
        >
          <Text style={[styles.metricChipText, metric === 'expenses' && styles.metricChipTextActive]}>
            Top wydatki
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metricChip, metric === 'income' && styles.metricChipActive]}
          onPress={() => setMetric('income')}
        >
          <Text style={[styles.metricChipText, metric === 'income' && styles.metricChipTextActive]}>
            Top przychody
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Laduje ranking...</Text>
        </View>
      ) : null}

      {!loading && !rows.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Brak danych</Text>
          <Text style={styles.emptyText}>Gdy userzy dodadza operacje, ranking pojawi sie tutaj.</Text>
        </View>
      ) : null}

      {!loading
        ? rows.map((item) => (
            <View key={item.userId} style={styles.userCard}>
              <View style={styles.userTopRow}>
                <View style={styles.rankBubble}>
                  <Text style={styles.rankText}>#{item.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>@{item.username}</Text>
                  <Text style={styles.userDisplayName}>{item.displayName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metricLabel}>
                    {metric === 'income' ? 'Przychody' : 'Wydatki'}
                  </Text>
                  <Text style={styles.metricValue}>
                    {formatMoney(metric === 'income' ? item.totalIncome : item.totalExpenses)}
                  </Text>
                </View>
              </View>

              <View style={styles.userBottomRow}>
                <Text style={styles.userMeta}>Operacje: {item.operationsCount}</Text>
                <Text style={styles.userMeta}>Top kategoria: {item.topExpenseCategory || '-'}</Text>
              </View>
            </View>
          ))
        : null}
    </ScrollView>
  );
}
