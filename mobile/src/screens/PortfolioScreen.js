import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import api from '../api/apiClient';
import { useAppTheme } from '../theme/ThemeContext';
import { createPortfolioStyles } from '../styles';

export default function PortfolioScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createPortfolioStyles(colors), [colors]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const res = await api.get('/wallet/portfolio');
      setItems(res.data || []);
    } catch (err) {
      console.log('ERR PORTFOLIO:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const totalPln = items
    .filter((item) => item.currency_code === 'PLN')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
          <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
          <Text style={styles.heroCaption}>Portfele</Text>
          <Text style={styles.heroTitle}>Twoje konta</Text>
          <Text style={styles.heroMeta}>Podsumowanie aktywow i sald w jednym miejscu.</Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Saldo PLN</Text>
            <Text style={styles.heroPillValue}>{totalPln.toFixed(2)} PLN</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <FlatList
            style={{ marginTop: 10 }}
            contentContainerStyle={styles.listContent}
            data={items}
            keyExtractor={(item, index) => item.currency_code + '_' + index.toString()}
            renderItem={({ item }) => (
              <View style={styles.assetCard}>
                <Text style={styles.assetCode}>{item.currency_code}</Text>
                <Text style={styles.assetValue}>{Number(item.amount || 0).toFixed(2)}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Brak danych</Text>
                <Text style={styles.emptyText}>Dodaj przychod, aby utworzyc pierwszy portfel.</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}
