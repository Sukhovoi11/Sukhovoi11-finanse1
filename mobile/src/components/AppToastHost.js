import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { subscribeNotify } from '../utils/appNotify';
import { useAppTheme } from '../theme/ThemeContext';
import { createAppToastHostStyles } from '../styles';

const TOAST_TOTAL_MS = 1500;
const TOAST_ENTER_MS = 180;
const TOAST_EXIT_MS = 220;

export default function AppToastHost() {
  const [toast, setToast] = useState(null);
  const { colors, notificationsEnabled } = useAppTheme();
  const styles = useMemo(() => createAppToastHostStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const clearScheduled = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (animRef.current) {
        animRef.current.stop();
      }
    };

    const animateIn = () => {
      opacity.setValue(0);
      translateY.setValue(20);
      animRef.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: TOAST_ENTER_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: TOAST_ENTER_MS,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();
    };

    const animateOut = () => {
      animRef.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: TOAST_EXIT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 14,
          duration: TOAST_EXIT_MS,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start(({ finished }) => {
        if (finished) {
          setToast(null);
        }
      });
    };

    return subscribeNotify((toast) => {
      if (!notificationsEnabled) return;

      clearScheduled();
      setToast(toast);
      animateIn();

      hideTimerRef.current = setTimeout(() => {
        animateOut();
      }, Math.max(TOAST_TOTAL_MS - TOAST_EXIT_MS, 800));
    });
  }, [notificationsEnabled, opacity, translateY]);

  useEffect(() => {
    if (!notificationsEnabled) {
      setToast(null);
    }
  }, [notificationsEnabled]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    },
    []
  );

  if (!toast) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.title}>{toast.title}</Text>
        <Text style={styles.message}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}
