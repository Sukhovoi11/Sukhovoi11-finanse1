import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import api from '../api/apiClient';
import TransactionItem from '../components/TransactionItem';
import BottomNav from '../components/BottomNav';
import { useAppTheme } from '../theme/ThemeContext';
import { notify } from '../utils/appNotify';
import { createHistoryStyles } from '../styles';

export default function HistoryScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createHistoryStyles(colors), [colors]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transactions/history');
      setItems(res.data || []);
    } catch (err) {
      console.log('ERR HISTORY:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadHistory);
    loadHistory();
    return unsubscribe;
  }, [navigation]);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const renderItem = ({ item }) => (
    <TransactionItem
      type={item.type}
      currency_from={item.currency_from}
      currency_to={item.currency_to}
      amount={item.amount}
      rate={item.rate}
      created_at={item.created_at}
      deleting={deletingId === item.transaction_id}
      onDelete={async () => {
        try {
          setDeletingId(item.transaction_id);
          await api.delete(`/transactions/${item.transaction_id}`);
          await loadHistory();
          notify('Sukces', 'Transakcja zostala usunieta.');
        } catch (err) {
          console.log('ERR DELETE TRANSACTION:', err?.response?.data || err.message);
          notify('Blad', err?.response?.data?.message || 'Nie udalo sie usunac transakcji.');
        } finally {
          setDeletingId(null);
        }
      }}
    />
  );

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
          <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
          <Text style={styles.heroCaption}>Historia</Text>
          <Text style={styles.heroTitle}>Twoje operacje</Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>Wpisy</Text>
              <Text style={styles.heroPillValue}>{items.length}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillLabel}>Suma kwot</Text>
              <Text style={styles.heroPillValue}>{totalAmount.toFixed(2)} PLN</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <FlatList
            style={{ marginTop: 10 }}
            contentContainerStyle={styles.listContent}
            data={items}
            keyExtractor={(item) => item.transaction_id.toString()}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Brak operacji</Text>
                <Text style={styles.emptyText}>Dodaj pierwsza operacje, aby zobaczyc historie.</Text>
              </View>
            }
          />
        )}
      </View>
      <BottomNav navigation={navigation} activeRoute="History" />
    </View>
  );
}
