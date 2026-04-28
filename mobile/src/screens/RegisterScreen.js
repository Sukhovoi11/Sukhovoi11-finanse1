import React, { useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import api from '../api/apiClient';
import AppButton from '../components/AppButton';
import { notify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createAuthStyles } from '../styles';

export default function RegisterScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createAuthStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return notify('Blad', 'Podaj poprawny adres email');
    }
    if (!password || password.length < 6) {
      return notify('Blad', 'Haslo musi miec min. 6 znakow');
    }

    try {
      await api.post('/auth/register', { email: normalizedEmail, password });
      notify('Sukces', 'Konto utworzone pomyslnie! Mozesz sie teraz zalogowac.');
      navigation.navigate('Login');
    } catch (err) {
      console.log('ERR REGISTER:', err?.response?.data || err.message);
      notify('Blad', 'Nie udalo sie zarejestrowac. Email moze byc juz zajety.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.authCard}>
        <Text style={styles.title}>Finanse+</Text>
        <Text style={styles.subtitle}>Zaloz konto i uporzadkuj budzet</Text>

        <Text style={styles.label}>Twoj Email</Text>
        <TextInput
          style={styles.input}
          placeholder="np. kasa@finanse.pl"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Haslo dostepu</Text>
        <TextInput
          style={styles.input}
          placeholder="minimum 6 znakow"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={{ marginTop: 10 }}>
          <AppButton title="Utworz konto" onPress={handleRegister} />
        </View>

        <AppButton
          title="Mam juz konto? Zaloguj sie"
          variant="secondary"
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </View>
  );
}
