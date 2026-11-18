import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, TextStyle } from 'react-native';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Thin wrapper so the icon set can be swapped in one place. */
export function Icon({ name, size = 20, color, style }: IconProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
