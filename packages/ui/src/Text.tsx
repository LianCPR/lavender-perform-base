import { fontFamily, useTheme, type TypographyVariant } from '@lavender/design-system';
import { Text as RNText, type TextProps as RNTextProps, type StyleProp, type TextStyle } from 'react-native';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'favorite' | 'inverse';

type TextColorKey =
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'accent'
  | 'accentText'
  | 'accentStrong'
  | 'favorite'
  | 'textInverse';

const toneKeys: Record<TextTone, TextColorKey> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  accent: 'accentText',
  favorite: 'favorite',
  inverse: 'textInverse',
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
}

/** Text with a token variant and a semantic color tone. */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        { color: theme.colors[toneKeys[tone]], fontFamily },
        theme.typography[variant],
        style,
      ]}
    />
  );
}
