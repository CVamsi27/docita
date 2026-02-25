import { Button, type ButtonProps } from "./button";

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="default" {...props} />;
}
