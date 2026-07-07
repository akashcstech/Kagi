import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { touchActivity } from '@/services/autoLock';
import { useAuthStore } from '@/stores/authStore';
import { useAutoLockWatcher } from '@/hooks/useAutoLockWatcher';
import { ThemeProvider, useTheme } from '@/theme';
import { ToastHost } from '@/components/ToastHost';

/** Route-group segment for each vault status, used to keep the URL in sync with auth state. */
const GROUP_FOR_STATUS = {
  uninitialized: '(onboarding)',
  locked: '(auth)',
  unlocked: '(app)',
} as const;

function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const refresh = useAuthStore((s) => s.refresh);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    const currentGroup = segments[0];
    const targetGroup = GROUP_FOR_STATUS[status];

    if (currentGroup !== targetGroup) {
      router.replace(status === 'unlocked' ? '/(app)' : status === 'locked' ? '/(auth)/login' : '/(onboarding)');
    }
  }, [status, segments, router]);

  useAutoLockWatcher();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <View
            style={{ flex: 1 }}
            onStartShouldSetResponder={() => {
              touchActivity();
              return false;
            }}
          >
            <AuthGate />
            <ToastHost />
            <ThemedStatusBar />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
