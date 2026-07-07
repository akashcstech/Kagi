import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

/**
 * Placeholder — Feature C replaces this with the real master-password /
 * biometric unlock screen (login(), loginWithBiometrics(), WrongPasswordError handling).
 */
export default function LoginPlaceholder() {
  const { colors, fontFamily, fontSize, spacing, radii } = useTheme();
  const markUnlocked = useAuthStore((s) => s.markUnlocked);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.lg }}>
        Locked
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
        Feature C will add the master password field and biometric unlock here.
      </Text>

      {__DEV__ && (
        <Pressable
          onPress={markUnlocked}
          style={{
            marginTop: spacing.xl,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.borderStrong,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>
            Dev only — skip to unlocked
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
