import * as DocumentPicker from 'expo-document-picker';

export interface PickedBackupFile {
  uri: string;
  name: string;
}

export async function pickBackupFile(): Promise<PickedBackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.name };
}
