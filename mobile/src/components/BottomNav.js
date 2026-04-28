import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import api from '../api/apiClient';
import { useAppTheme } from '../theme/ThemeContext';
import { createBottomNavStyles } from '../styles';

const HomeIcon = ({ color }) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M3 11.5L12 4l9 7.5" />
    <Path d="M5 10.5V20h14v-9.5" />
  </Svg>
);

const WalletIcon = ({ color }) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
    <Path d="M16 12h4" />
  </Svg>
);

const HistoryIcon = ({ color }) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Circle cx="12" cy="12" r="8" />
    <Path d="M12 8v4l3 2" />
  </Svg>
);

const tabs = [
  { route: 'Dashboard', icon: HomeIcon, label: 'Start' },
  { route: 'Expenses', icon: WalletIcon, label: 'Wydatki' },
  { route: 'History', icon: HistoryIcon, label: 'Historia' },
  { route: 'Profile', label: 'Profil' },
];

export default function BottomNav({ navigation, activeRoute }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createBottomNavStyles(colors), [colors]);

  const [profileAvatarText, setProfileAvatarText] = useState('P');

  useEffect(() => {
    let mounted = true;

    const loadProfileMini = async () => {
      try {
        const res = await api.get('/profile/me');
        const source = String(res.data?.displayName || res.data?.username || 'Profil').trim();
        const mini = source.slice(0, 2).toUpperCase();
        if (mounted) {
          setProfileAvatarText(mini || 'P');
        }
      } catch (err) {
        if (mounted) {
          setProfileAvatarText('P');
        }
      }
    };

    loadProfileMini();
    return () => {
      mounted = false;
    };
  }, [activeRoute]);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.nav}>
        {tabs.map((tab) => {
          const isActive = tab.route === activeRoute;
          const color = isActive ? colors.primary : colors.muted;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.route}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => navigation.navigate(tab.route)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              {tab.route === 'Profile' ? (
                <View style={[styles.profileMiniRing, isActive && styles.profileMiniRingActive]}>
                  <View style={styles.profileMiniInner}>
                    <Text style={[styles.profileMiniText, isActive && styles.profileMiniTextActive]}>
                      {profileAvatarText}
                    </Text>
                  </View>
                </View>
              ) : (
                <Icon color={color} />
              )}
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
