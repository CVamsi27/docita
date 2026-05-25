import * as React from "react";
import { Button } from "@workspace/ui/components/form/button";

export type ButtonProps = React.ComponentProps<typeof Button>;

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="default" {...props} />;
}
