import { useReducedMotion, useTheme } from '@lavender/design-system';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { IconButton } from '../buttons/IconButton';
import { GlassSurface } from '../GlassSurface';
import { Text } from '../Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Fixed row rendered below the scrollable body. */
  footer?: ReactNode;
  maxWidth?: number;
  scroll?: boolean;
}

/**
 * The one overlay surface: a scrim plus a centered Liquid Glass panel.
 *
 * Motion follows Apple's materialize idea rather than a plain fade: the scrim
 * comes up first, then the panel forms — it settles from 0.965 scale with a
 * short downward travel while its content fades in slightly behind it. The panel
 * never animates opacity of the glass *material* below 1 on native; the whole
 * layer fades as one, which is how a modal presentation can be animated without
 * exposing the blur.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 560,
  scroll = true,
}: SheetProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const appear = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const closing = useRef(false);

  useEffect(() => {
    if (reducedMotion) {
      appear.setValue(visible ? 1 : 0);
      return;
    }
    if (visible) {
      closing.current = false;
      appear.setValue(0);
      const animation = Animated.timing(appear, {
        toValue: 1,
        duration: theme.motion.menu,
        easing: Easing.bezier(...theme.motion.easingBezier.materialize),
        useNativeDriver: Platform.OS !== 'web',
      });
      animation.start();
      return () => animation.stop();
    }
  }, [appear, reducedMotion, theme.motion, visible]);

  /** Play the dismissal, then hand control back to the caller. */
  const requestClose = () => {
    if (reducedMotion || closing.current) {
      onClose();
      return;
    }
    closing.current = true;
    Animated.timing(appear, {
      toValue: 0,
      duration: theme.motion.base,
      easing: Easing.bezier(...theme.motion.easingBezier.standard),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}>
      <View style={styles.fill}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.colors.scrim,
              opacity: appear,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={requestClose}
          style={StyleSheet.absoluteFill}
        />
        {/*
          The panel itself never fades: `opacity < 1` on an ancestor strips the
          backdrop filter on web and flickers the system blur on iOS. It forms by
          geometry instead — a short rise and 0.965 scale — while the scrim fades.
        */}
        <Animated.View
          style={{
            width: '100%',
            maxWidth,
            transform: [
              {
                translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
              },
              {
                scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] }),
              },
            ],
          }}>
          <GlassSurface
            material="overlay"
            cornerRadius={theme.radius.card}
            style={{
              width: '100%',
              maxHeight: '88%',
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
            }}>
            <View style={styles.header}>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text variant="subheading" numberOfLines={2}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="caption" tone="secondary" numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <IconButton icon="close" label="Close" onPress={requestClose} />
            </View>

            {scroll ? (
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.md }}>
                {children}
              </ScrollView>
            ) : (
              <View style={{ gap: theme.spacing.md }}>{children}</View>
            )}

            {footer ? <View style={{ gap: theme.spacing.sm }}>{footer}</View> : null}
          </GlassSurface>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
});
