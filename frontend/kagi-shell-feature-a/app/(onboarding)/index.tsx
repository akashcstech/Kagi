import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Placeholder — Feature B replaces this with the Welcome screen and
 * Create Master Password flow (form, strength meter, setupMasterPassword call).
 */
export default function OnboardingPlaceholder() {
  const { colors, fontFamily, fontSize, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.lg }}>
        Onboarding
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.base,
          marginTop: spacing.sm,
          textAlign: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        No vault yet on this device. Feature B will add the Welcome and Create Master Password screens here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
