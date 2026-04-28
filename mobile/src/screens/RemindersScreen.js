import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api/apiClient';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createRemindersStyles } from '../styles';

const formatMoney = (amount) => (amount ? `${Number(amount).toFixed(2)} PLN` : 'Kwota: -');

const getDaysToDue = (dateString) => {
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startTarget - startNow) / 86400000);
};

const getDueBadge = (reminder) => {
  if (reminder.is_paid) return { text: 'Oplacone', color: '#16A34A', bg: '#DCFCE7' };
  const days = getDaysToDue(reminder.due_date);
  if (days === null) return { text: 'Bez daty', color: '#6B7280', bg: '#F3F4F6' };
  if (days < 0) return { text: 'Po terminie', color: '#E11D48', bg: '#FFE4E6' };
  if (days <= 3) return { text: 'Pilne', color: '#EA580C', bg: '#FFEDD5' };
  return { text: `Za ${days} dni`, color: '#2563EB', bg: '#DBEAFE' };
};

export default function RemindersScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createRemindersStyles(colors), [colors]);

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingReminderId, setDeletingReminderId] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reminders');
      setReminders(res.data || []);
    } catch (err) {
      console.log('ERR REMINDERS:', err?.response?.data || err.message);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCreate = async () => {
    if (!title || !dueDate) {
      return notify('Blad', 'Podaj tytul i termin platnosci.');
    }

    const parsedAmount = amount ? parseFloat(String(amount).replace(',', '.')) : null;
    if (amount && (!parsedAmount || parsedAmount <= 0)) {
      return notify('Blad', 'Kwota musi byc wieksza od 0.');
    }

    try {
      setSubmitting(true);
      await api.post('/reminders', {
        title,
        amount: parsedAmount,
        dueDate,
      });
      setTitle('');
      setAmount('');
      setDueDate('');
      await loadReminders();
      notify('Sukces', 'Przypomnienie zostalo dodane.');
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie dodac przypomnienia.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePaid = async (reminder) => {
    try {
      await api.patch(`/reminders/${reminder.reminder_id}`, { isPaid: !reminder.is_paid });
      await loadReminders();
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie zaktualizowac statusu.');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      setDeletingReminderId(reminderId);
      await api.delete(`/reminders/${reminderId}`);
      await loadReminders();
      notify('Sukces', 'Przypomnienie zostalo usuniete.');
    } catch (err) {
      notify('Blad', err?.response?.data?.message || 'Nie udalo sie usunac przypomnienia.');
    } finally {
      setDeletingReminderId(null);
    }
  };

  const reminderStats = useMemo(() => {
    const unpaid = reminders.filter((item) => !item.is_paid);
    const totalOpen = unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      unpaidCount: unpaid.length,
      totalOpen,
    };
  }, [reminders]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.screen}>
      <View style={styles.heroCard}>
        <View style={[styles.heroGlowOne, { backgroundColor: colors.secondary }]} />
        <View style={[styles.heroGlowTwo, { backgroundColor: colors.accent }]} />
        <Text style={styles.heroCaption}>Reminder center</Text>
        <Text style={styles.heroTitle}>Przypomnienia platnosci</Text>
        <Text style={styles.heroMeta}>Pilnuj rachunkow i terminow w jednym miejscu.</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Do oplacenia</Text>
            <Text style={styles.statValue}>{reminderStats.unpaidCount}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Kwota otwarta</Text>
            <Text style={styles.statValue}>{formatMoney(reminderStats.totalOpen)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nowe przypomnienie</Text>
        <TextInput
          style={styles.input}
          placeholder="Np. Czynsz, Netflix"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Kwota (opcjonalnie)"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={amount}
          onChangeText={(value) => setAmount(value.replace(/[^0-9.,]/g, ''))}
        />
        <TextInput
          style={styles.input}
          placeholder="Termin (YYYY-MM-DD)"
          placeholderTextColor={colors.muted}
          value={dueDate}
          onChangeText={setDueDate}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Dodawanie...' : 'Dodaj przypomnienie'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Lista przypomnien</Text>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {!loading && !reminders.length ? (
          <Text style={styles.emptyText}>Brak przypomnien. Dodaj pierwsze i miej spokoj.</Text>
        ) : null}

        {reminders.map((reminder) => {
          const badge = getDueBadge(reminder);
          return (
            <View key={reminder.reminder_id} style={[styles.reminderCard, reminder.is_paid && styles.reminderDone]}>
              <View style={styles.reminderHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <Text style={styles.reminderDate}>{reminder.due_date}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                </View>
              </View>
              <View style={styles.reminderBottom}>
                <Text style={styles.reminderAmount}>{formatMoney(reminder.amount)}</Text>
                <View style={styles.reminderActions}>
                  <TouchableOpacity onPress={() => togglePaid(reminder)} style={styles.markPaidButton}>
                    <Text style={styles.reminderAction}>
                      {reminder.is_paid ? 'Oznacz jako nieoplacone' : 'Oznacz jako oplacone'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteReminderButton}
                    onPress={() => handleDeleteReminder(reminder.reminder_id)}
                    disabled={deletingReminderId === reminder.reminder_id}
                  >
                    <Text style={styles.deleteReminderButtonText}>
                      {deletingReminderId === reminder.reminder_id ? 'Usuwanie...' : 'Usun'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
