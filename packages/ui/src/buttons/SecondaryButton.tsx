import { ButtonBase } from './ButtonBase';
import type { ButtonProps } from './PrimaryButton';

/**
 * The neutral companion to PrimaryButton: a solid raised surface with a
 * hairline border. Use for cancel/back and non-destructive secondary actions.
 */
export function SecondaryButton(props: ButtonProps) {
  return <ButtonBase variant="secondary" {...props} />;
}
