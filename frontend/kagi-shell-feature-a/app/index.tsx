import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme';

export default function InitialRoute() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  );
}
