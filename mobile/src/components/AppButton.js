import React from 'react';
import { TouchableOpacity, Text, Platform } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { createAppButtonStyles } from '../styles';

export default function AppButton({ title, onPress, variant = 'primary', style }) {
  const isSecondary = variant === 'secondary';
  const { colors } = useAppTheme();
  const styles = createAppButtonStyles(colors);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.button,
        isSecondary ? styles.secondaryButton : styles.primaryButton,
        style,
        Platform.select({
          web: { cursor: 'pointer' },
        }),
      ]}
    >
      <Text style={[styles.text, isSecondary ? styles.secondaryText : styles.primaryText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
