import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lock } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

/**
 * Placeholder — Feature D replaces this with the folder-first home screen.
 */
export default function AppHomePlaceholder() {
  const { colors, fontFamily, fontSize, spacing, radii } = useTheme();
  const markLocked = useAuthStore((s) => s.markLocked);

  const handleLock = () => {
    lock();
    markLocked();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.lg }}>
        Vault unlocked
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
        Feature D will add the folder tree, search bar, and new-entry button here.
      </Text>

      <Pressable
        onPress={handleLock}
        style={{
          marginTop: spacing.xl,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.borderStrong,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>Lock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
