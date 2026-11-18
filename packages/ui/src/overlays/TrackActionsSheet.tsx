import { useTheme } from '@lavender/design-system';
import type { Track } from '@lavender/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';
import { Sheet } from './Sheet';

export interface TrackActionsSheetProps {
  track: Track;
  visible: boolean;
  onClose: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

/**
 * Per-track queue actions. Listening controls live here so rows in the library
 * can queue music without adding a second playback path.
 */
export function TrackActionsSheet({
  track,
  visible,
  onClose,
  onPlayNext,
  onAddToQueue,
  onEdit,
  onRemove,
}: TrackActionsSheetProps) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);

  const rows: { icon: IconName; label: string; hint?: string; onPress: () => void; danger?: boolean }[] = [
    { icon: 'play-skip-forward', label: 'Play next', hint: 'Insert after the current track', onPress: onPlayNext },
    { icon: 'add-circle-outline', label: 'Add to queue', onPress: onAddToQueue },
  ];
  if (onEdit) rows.push({ icon: 'create-outline', label: 'Edit details', onPress: onEdit });
  if (onRemove) {
    rows.push({
      icon: 'trash-outline',
      label: confirming ? 'Confirm remove from library' : 'Remove from library',
      hint: confirming ? 'The file reference is removed from this device' : 'Does not delete the original file',
      danger: true,
      onPress: () => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setConfirming(false);
        onRemove();
      },
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={track.title} subtitle={track.artistName}>
      <View style={{ gap: theme.spacing.xs }}>
        {rows.map((row) => (
          <Interactive
            key={row.label}
            onPress={row.onPress}
            accessibilityLabel={row.label}
            focusRadius={theme.radius.control}
            style={{ borderRadius: theme.radius.control }}>
            {({ hovered }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.control,
                  backgroundColor: hovered ? theme.colors.hover : 'transparent',
                }}>
                <Icon
                  name={row.icon}
                  size={18}
                  color={row.danger ? theme.colors.danger : theme.colors.textSecondary}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text
                    variant="headline"
                    style={row.danger ? { color: theme.colors.danger } : undefined}>
                    {row.label}
                  </Text>
                  {row.hint ? (
                    <Text variant="caption" tone="tertiary">
                      {row.hint}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </Interactive>
        ))}
      </View>
    </Sheet>
  );
}
