import { fontFamily, useTheme } from '@lavender/design-system';
import type { Track } from '@lavender/shared';
import { useEffect, useState } from 'react';
import { Platform, TextInput, View, type TextStyle } from 'react-native';

import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { Text } from '../Text';
import { Sheet } from './Sheet';

export interface TrackEditSheetProps {
  track: Track;
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: { title: string; artistName: string; albumTitle: string }) => void;
}

const inputBase: TextStyle = {
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
};

const webOutline = Platform.select<TextStyle>({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
});

/** Edits metadata for an imported file when tags were missing or wrong. */
export function TrackEditSheet({ track, visible, onCancel, onSubmit }: TrackEditSheetProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artistName);
  const [album, setAlbum] = useState(track.albumTitle);

  // Reset whenever a different track is opened.
  useEffect(() => {
    setTitle(track.title);
    setArtist(track.artistName);
    setAlbum(track.albumTitle);
  }, [track.id, track.title, track.artistName, track.albumTitle]);

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title="Edit track"
      subtitle={track.artistName}
      footer={
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <PrimaryButton
            label="Save"
            size="sm"
            onPress={() => onSubmit({ title, artistName: artist, albumTitle: album })}
          />
          <SecondaryButton label="Cancel" size="sm" onPress={onCancel} />
        </View>
      }>
      <View style={{ gap: theme.spacing.md }}>
        {[
          { label: 'Title', value: title, set: setTitle },
          { label: 'Artist', value: artist, set: setArtist },
          { label: 'Album', value: album, set: setAlbum },
        ].map((field) => (
          <View key={field.label} style={{ gap: theme.spacing.xs }}>
            <Text variant="caption" tone="secondary">
              {field.label}
            </Text>
            <TextInput
              value={field.value}
              onChangeText={field.set}
              accessibilityLabel={field.label}
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                inputBase,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.inputBackground,
                  color: theme.colors.text,
                  fontFamily,
                },
                webOutline,
              ]}
            />
          </View>
        ))}
      </View>
    </Sheet>
  );
}
