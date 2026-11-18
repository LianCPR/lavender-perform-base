import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '../Icon';
import { ButtonBase, type ButtonSize } from './ButtonBase';

export interface ButtonProps {
  label: string;
  icon?: IconName;
  trailingIcon?: IconName;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** The single primary action on a surface. */
export function PrimaryButton(props: ButtonProps) {
  return <ButtonBase variant="primary" {...props} />;
}
