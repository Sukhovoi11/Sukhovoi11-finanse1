import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import api from '../api/apiClient';
import { useAppTheme } from '../theme/ThemeContext';
import { createCategoryStatsStyles } from '../styles';

const CATEGORY_LABELS = {
  TRANSPORT: 'Transport',
  JEDZENIE: 'Jedzenie',
  MIESZKANIE: 'Mieszkanie',
  ZDROWIE: 'Zdrowie',
  ROZRYWKA: 'Rozrywka',
  INNE: 'Inne',
};

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${x} ${y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
};

export default function CategoryStatsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createCategoryStatsStyles(colors), [colors]);

  const categoryPalette = useMemo(
    () => [colors.primary, colors.secondary, colors.accent, '#2563EB', '#16A34A', '#F97316'],
    [colors.accent, colors.primary, colors.secondary]
  );

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions/history');
      setHistory(res.data || []);
    } catch (err) {
      console.log('ERR HISTORY (stats):', err?.response?.data || err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const expenses = history.filter((item) => item.type === 'EXPENSE');
    const byCategory = expenses.reduce((acc, item) => {
      const key = (item.currency_from || 'INNE').toUpperCase();
      acc[key] = (acc[key] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
    const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);
    const rows = Object.entries(byCategory)
      .map(([key, value], index) => ({
        key,
        label: CATEGORY_LABELS[key] || key,
        value,
        color: categoryPalette[index % categoryPalette.length],
      }))
      .sort((a, b) => b.value - a.value);
    return { total, rows };
  }, [categoryPalette, history]);

  const chartSize = 220;
  const radius = 90;
  const center = chartSize / 2;

  let startAngle = 0;
  const slices = stats.rows.map((row) => {
    const percent = stats.total ? (row.value / stats.total) * 100 : 0;
    const endAngle = startAngle + (percent / 100) * 360;
    const path = describeArc(center, center, radius, startAngle, endAngle);
    const slice = { ...row, percent, path };
    startAngle = endAngle;
    return slice;
  });

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
        <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
        <Text style={styles.heroCaption}>Statystyki</Text>
        <Text style={styles.heroTitle}>Wydatki wg kategorii</Text>
        <Text style={styles.heroMeta}>Sprawdz, gdzie najczesciej uciekaja pieniadze.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 20 }} />
      ) : stats.total ? (
        <View style={styles.card}>
          <Svg width={chartSize} height={chartSize}>
            <G>
              {slices.map((slice) => (
                <Path key={slice.key} d={slice.path} fill={slice.color} />
              ))}
              <Circle cx={center} cy={center} r={52} fill={colors.surface} />
            </G>
          </Svg>
          <View style={styles.centerLabel}>
            <Text style={styles.centerLabelTitle}>Razem</Text>
            <Text style={styles.centerLabelValue}>{stats.total.toFixed(2)} PLN</Text>
          </View>

          <View style={styles.legend}>
            {slices.map((slice) => (
              <View key={slice.key} style={styles.legendRow}>
                <View style={[styles.colorDot, { backgroundColor: slice.color }]} />
                <Text style={styles.legendLabel}>{slice.label}</Text>
                <Text style={styles.legendValue}>{slice.percent.toFixed(0)}%</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Brak danych do wykresu</Text>
          <Text style={styles.emptyText}>Dodaj kilka wydatkow, aby zobaczyc statystyki kategorii.</Text>
        </View>
      )}
    </ScrollView>
  );
}
