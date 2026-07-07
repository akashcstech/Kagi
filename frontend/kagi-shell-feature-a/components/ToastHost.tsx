import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clipboardEvents } from '@/services/clipboard';
import { useTheme } from '@/theme';

const VISIBLE_MS = 1800;

function messageFor(event: { type: 'copied'; fieldLabel?: string } | { type: 'cleared' }): string {
  if (event.type === 'cleared') return 'Clipboard cleared';
  return event.fieldLabel ? `${event.fieldLabel} copied` : 'Copied';
}

export function ToastHost() {
  const { colors, spacing, radii, fontFamily, fontSize } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = clipboardEvents.subscribe((event) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setMessage(messageFor(event));
      opacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });

      hideTimer.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
        translateY.value = withTiming(8, { duration: 200, easing: Easing.in(Easing.quad) });
      }, VISIBLE_MS);
    });

    return () => {
      unsubscribe();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        animatedStyle,
        {
          bottom: insets.bottom + spacing.xl,
          backgroundColor: colors.textPrimary,
          borderRadius: radii.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
        },
      ]}
    >
      <Text style={{ color: colors.inverseText, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
});
