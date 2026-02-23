/**
 * Primary Button
 * For main actions (submit, confirm, etc.)
 */

import { Button, type ButtonProps } from "./button";

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="default" {...props} />;
}
