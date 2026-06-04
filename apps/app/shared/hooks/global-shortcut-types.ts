export interface GlobalShortcutContext {
  isInConsultation: boolean;
  consultationId?: string;
  onSaveConsultation?: () => void;
  onCompleteConsultation?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
}
