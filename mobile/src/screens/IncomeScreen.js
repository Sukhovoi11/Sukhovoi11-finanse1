import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Keyboard, TouchableWithoutFeedback, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import api from '../api/apiClient';
import AppButton from '../components/AppButton';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createIncomeStyles } from '../styles';

const QUICK_AMOUNTS = [100, 300, 500, 1000];

export default function IncomeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createIncomeStyles(colors), [colors]);

  const [amount, setAmount] = useState('');
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const loadPortfolio = async () => {
    try {
      setLoadingPortfolio(true);
      const res = await api.get('/wallet/portfolio');
      setPortfolio(res.data || []);
    } catch (err) {
      console.log('ERR PORTFOLIO (topup):', err?.response?.data || err.message);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const plnBalance = portfolio.find((p) => p.currency_code === 'PLN')?.amount ?? 0;

  const handleIncome = async (value) => {
    try {
      await api.post('/wallet/topup', { amount: value });
      notify('Sukces', 'Przychod zostal dodany do portfela');
      setAmount('');
      loadPortfolio();
    } catch (err) {
      console.log('ERR TOPUP:', err?.response?.data || err.message);
      notify('Blad', 'Nie udalo sie dodac przychodu.');
    }
  };

  const handleTopUp = () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      return notify('Blad', 'Podaj poprawna kwote w PLN');
    }
    handleIncome(value);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
        <View style={styles.heroCard}>
          <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
          <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
          <Text style={styles.heroCaption}>Przychody</Text>
          <Text style={styles.heroTitle}>Doladuj portfel</Text>
          <Text style={styles.heroMeta}>Srodki trafia od razu do salda i historii.</Text>

          <TouchableOpacity onPress={loadPortfolio} activeOpacity={0.85} style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Dostepne srodki</Text>
            {loadingPortfolio ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.heroPillValue}>{plnBalance.toFixed(2)} PLN</Text>
            )}
            <Text style={styles.heroPillHint}>Tapnij, aby odswiezyc saldo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Kwota przychodu (PLN)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((val) => (
              <TouchableOpacity key={val} style={styles.quickChip} onPress={() => setAmount(String(val))}>
                <Text style={styles.quickChipText}>+{val}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <AppButton title="Dodaj przychod" onPress={handleTopUp} />
          <Text style={styles.footerNote}>
            Operacja zapisze sie automatycznie w historii finansowej.
          </Text>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}
