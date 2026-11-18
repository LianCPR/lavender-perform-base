import { fontFamily, useTheme } from '@lavender/design-system';
import { useEffect, useState } from 'react';
import { Platform, TextInput, View, type TextStyle } from 'react-native';

import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { Text } from '../Text';
import { Sheet } from './Sheet';

const webInputReset = Platform.select<TextStyle>({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
});

export interface TextPromptSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}

/** Single-field prompt used for creating and renaming playlists. */
export function TextPromptSheet({
  visible,
  title,
  description,
  label,
  initialValue = '',
  confirmLabel = 'Save',
  onCancel,
  onSubmit,
}: TextPromptSheetProps) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);

  // Reset to the current name each time the prompt opens.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [initialValue, visible]);

  const trimmed = value.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={title}
      subtitle={description}
      scroll={false}
      maxWidth={420}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="label" tone="tertiary">
          {label}
        </Text>
        <View
          style={{
            borderRadius: theme.radius.control,
            borderWidth: theme.border.hairline,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.spacing.md,
          }}>
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={submit}
            returnKeyType="done"
            autoFocus
            placeholder="Playlist name"
            placeholderTextColor={theme.colors.textTertiary}
            accessibilityLabel={label}
            style={[
              {
                color: theme.colors.text,
                fontFamily,
                fontSize: theme.typography.body.fontSize,
                paddingVertical: theme.spacing.md,
              },
              webInputReset,
            ]}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
        <SecondaryButton label="Cancel" size="sm" onPress={onCancel} />
        <PrimaryButton label={confirmLabel} size="sm" disabled={!trimmed} onPress={submit} />
      </View>
    </Sheet>
  );
}
