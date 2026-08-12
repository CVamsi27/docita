import { FC } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Input, Label } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { UseVerifyDoctorReturn } from "@/features/setup/hooks/use-verify-doctor";

interface RegistrationFieldsProps {
  registrationNumber: string;
  setRegistrationNumber: (value: string) => void;
  registrationCouncil: string;
  setRegistrationCouncil: (value: string) => void;
  registrationStateCode: string;
  setRegistrationStateCode: (value: string) => void;
  registrationError: string | null;
  setRegistrationError: (value: string | null) => void;
  isSavingReg: boolean;
}

interface RegistrationStepProps extends RegistrationFieldsProps {
  hasRegistrationProgress: boolean;
  hasSavedRegistration: boolean;
  profile: UseVerifyDoctorReturn["profile"];
  onSave: () => void;
}

export const RegistrationStep: FC<RegistrationStepProps> = ({
  hasRegistrationProgress,
  hasSavedRegistration,
  profile,
  registrationNumber,
  setRegistrationNumber,
  registrationCouncil,
  setRegistrationCouncil,
  registrationStateCode,
  setRegistrationStateCode,
  registrationError,
  setRegistrationError,
  isSavingReg,
  onSave,
}) => {
  const triggerSaveIfReady = () => {
    if (!registrationNumber.trim() || isSavingReg) return;
    onSave();
  };

  return (
    <div className="ui-card-surface space-y-3 p-5">
      <div className="flex items-center gap-2">
        {hasRegistrationProgress ? (
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        )}
        <h2 className="font-semibold text-sm">
          Step 2: Medical Registration Number
        </h2>
      </div>
      {hasSavedRegistration ? (
        <SavedRegistrationView profile={profile} />
      ) : (
        <RegistrationForm
          registrationNumber={registrationNumber}
          setRegistrationNumber={setRegistrationNumber}
          registrationCouncil={registrationCouncil}
          setRegistrationCouncil={setRegistrationCouncil}
          registrationStateCode={registrationStateCode}
          setRegistrationStateCode={setRegistrationStateCode}
          registrationError={registrationError}
          setRegistrationError={setRegistrationError}
          isSavingReg={isSavingReg}
          onTriggerSave={triggerSaveIfReady}
        />
      )}
    </div>
  );
};

const SavedRegistrationView: FC<{
  profile: UseVerifyDoctorReturn["profile"];
}> = ({ profile }) => (
  <div className="space-y-2 text-sm text-muted-foreground">
    <p>
      Saved:
      <span className="ml-1 font-medium text-foreground">
        {profile?.registrationNumber}
      </span>
    </p>
    {(profile?.registrationCouncil || profile?.registrationStateCode) && (
      <p className="text-xs">
        {profile?.registrationCouncil ? (
          <>
            Council:
            <span className="ml-1 font-medium text-foreground">
              {profile.registrationCouncil}
            </span>
          </>
        ) : null}
        {profile?.registrationStateCode ? (
          <>
            <span className={profile?.registrationCouncil ? " ml-2" : ""}>
              Region:
              <span className="ml-1 font-medium text-foreground">
                {profile.registrationStateCode}
              </span>
            </span>
          </>
        ) : null}
      </p>
    )}
    <p className="text-xs">
      Verification timing depends on your council. You can continue once your
      registration number is saved.
    </p>
  </div>
);

interface RegistrationFormProps extends RegistrationFieldsProps {
  onTriggerSave: () => void;
}

const RegistrationForm: FC<RegistrationFormProps> = ({
  registrationNumber,
  setRegistrationNumber,
  registrationCouncil,
  setRegistrationCouncil,
  registrationStateCode,
  setRegistrationStateCode,
  registrationError,
  setRegistrationError,
  isSavingReg,
  onTriggerSave,
}) => (
  <div className="space-y-3">
    <div className="space-y-2">
      <Label
        htmlFor="registration-number"
        className="text-xs text-muted-foreground"
      >
        Medical council registration number
      </Label>
      <div className="relative">
        <Input
          id="registration-number"
          placeholder="Registration number"
          value={registrationNumber}
          onChange={(e) => {
            setRegistrationNumber(e.target.value);
            if (registrationError) setRegistrationError(null);
          }}
          onBlur={onTriggerSave}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            onTriggerSave();
          }}
          aria-invalid={registrationError ? true : false}
          className={`pr-10 ${registrationError ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
        />
        {isSavingReg ? (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          />
        ) : null}
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label
          htmlFor="registration-council"
          className="text-xs text-muted-foreground"
        >
          Issuing council (optional)
        </Label>
        <Input
          id="registration-council"
          placeholder="Medical council"
          value={registrationCouncil}
          onChange={(e) => setRegistrationCouncil(e.target.value)}
          onBlur={onTriggerSave}
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="registration-region"
          className="text-xs text-muted-foreground"
        >
          Region code (optional)
        </Label>
        <Input
          id="registration-region"
          placeholder="State code"
          value={registrationStateCode}
          onChange={(e) => setRegistrationStateCode(e.target.value)}
          onBlur={onTriggerSave}
        />
      </div>
    </div>
    <p className="text-xs text-muted-foreground">
      Save runs when you leave the registration number field or press Enter
      there. Optional fields are sent with the same save.
    </p>
    {registrationError && (
      <p className="text-xs text-destructive">{registrationError}</p>
    )}
  </div>
);
