import type { ButtonSize } from './buttons/ButtonBase';
import { ButtonBase, type ButtonVariant as BaseVariant } from './buttons/ButtonBase';
import type { IconName } from './Icon';
import type { StyleProp, ViewStyle } from 'react-native';

export type GlassButtonVariant = 'primary' | 'secondary' | 'tinted' | 'ghost';
export type GlassButtonSize = ButtonSize;

export interface GlassButtonProps {
  label?: string;
  icon?: IconName;
  trailingIcon?: IconName;
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Phase 01 API kept intact: `secondary` means "glass" here, because that is how
 * the existing screens express a glass pill. New code can use
 * `PrimaryButton`/`SecondaryButton`/`IconButton` directly.
 */
const variantMap: Record<GlassButtonVariant, BaseVariant> = {
  primary: 'primary',
  secondary: 'glass',
  tinted: 'tinted',
  ghost: 'ghost',
};

export function GlassButton({ variant = 'secondary', ...rest }: GlassButtonProps) {
  return <ButtonBase variant={variantMap[variant]} {...rest} />;
}
