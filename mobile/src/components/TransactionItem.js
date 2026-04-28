import React, { useMemo } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { createTransactionItemStyles } from '../styles';

const typeLabels = {
  BUY: 'Wymiana',
  SELL: 'Wymiana',
  INCOME: 'Przychod',
  EXPENSE: 'Wydatek',
  SAVING: 'Oszczednosci',
};

const typeColors = {
  INCOME: '#16A34A',
  EXPENSE: '#E11D48',
  BUY: '#2563EB',
  SELL: '#7C3AED',
  SAVING: '#EA580C',
};

export default function TransactionItem({
  type,
  currency_from,
  currency_to,
  amount,
  rate,
  created_at,
  onDelete,
  deleting = false,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createTransactionItemStyles(colors), [colors]);

  const title =
    type === 'EXPENSE' || type === 'SAVING'
      ? `${typeLabels[type] || type} • ${currency_from}`
      : `${typeLabels[type] || type} • ${currency_from} -> ${currency_to}`;

  return (
    <View style={styles.cardRow}>
      <View style={[styles.dot, { backgroundColor: typeColors[type] || colors.primary }]} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Kwota: <Text style={styles.metaStrong}>{Number(amount || 0).toFixed(2)} {currency_to || ''}</Text>
          </Text>
          <Text style={styles.metaText}>
            Kurs: {rate ?? (type === 'EXPENSE' || type === 'INCOME' || type === 'SAVING' ? '1' : '-')}
          </Text>
        </View>
        <Text style={styles.dateText}>{created_at}</Text>
      </View>
      {typeof onDelete === 'function' ? (
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={onDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteText}>{deleting ? '...' : 'Usun'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
