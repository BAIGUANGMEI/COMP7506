import { Alert, Platform } from 'react-native';

export function confirmDestructiveAction({
  title,
  message,
  confirmLabel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const confirm = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(confirm ? confirm(`${title}\n\n${message}`) : true);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}
