
import { ReactNode } from "react";

export type ConfirmVariant = "default" | "destructive" | "warning" | "success";

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: ReactNode;
    requireConfirmation?: string;
}

export interface PromptOptions extends Omit<ConfirmOptions, "requireConfirmation"> {
    placeholder?: string;
    defaultValue?: string;
    inputType?: "text" | "email" | "password" | "number";
    validation?: (value: string) => string | null;
}

export interface AlertOptions {
    title: string;
    description?: string;
    confirmText?: string;
    variant?: ConfirmVariant;
    icon?: ReactNode;
}
