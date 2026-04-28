import React, { useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import api from '../api/apiClient';
import AppButton from '../components/AppButton';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createAuthStyles } from '../styles';

export default function LoginScreen({ navigation, onLogin }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createAuthStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return notify('Blad', 'Podaj poprawny adres email');
    }
    if (!password || password.length < 6) {
      return notify('Blad', 'Haslo musi miec min. 6 znakow');
    }

    try {
      const res = await api.post('/auth/login', { email: normalizedEmail, password });
      onLogin(res.data.token);
    } catch (err) {
      console.log('ERR LOGIN:', err?.response?.data || err.message);
      notify('Blad', 'Nie udalo sie zalogowac. Sprawdz polaczenie z serwerem.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.authCard}>
        <Text style={styles.title}>Finanse+</Text>
        <Text style={styles.subtitle}>Zaloguj sie do panelu finansow osobistych</Text>

        <Text style={styles.label}>Adres Email</Text>
        <TextInput
          placeholder="email@finanse.pl"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Haslo</Text>
        <TextInput
          placeholder="wpisz haslo"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <View style={{ marginTop: 10 }}>
          <AppButton title="Zaloguj sie" onPress={handleLogin} />
        </View>

        <AppButton
          title="Nie masz konta? Zarejestruj sie"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
    </View>
  );
}
