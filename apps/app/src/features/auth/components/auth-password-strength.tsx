import { useTranslation } from "react-i18next";

const PASSWORD_STRENGTH_KEYS = [
  "passwordStrengthVeryWeak",
  "passwordStrengthWeak",
  "passwordStrengthFair",
  "passwordStrengthGood",
  "passwordStrengthStrong",
  "passwordStrengthVeryStrong",
] as const;

function getPasswordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getBarColor(score: number, index: number): string {
  if (index >= score) return "bg-muted";
  if (score <= 1) return "bg-destructive";
  if (score <= 3) return "bg-warning";
  return "bg-success";
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation("Auth");
  const tSignIn = (key: string, options?: Record<string, unknown>) =>
    t(`signIn.${key}`, options);
  if (!password) return null;
  const score = getPasswordScore(password);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${getBarColor(score, i)}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {tSignIn(PASSWORD_STRENGTH_KEYS[score])}
      </p>
    </div>
  );
}
