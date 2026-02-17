'use client';

import { useEffect, useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Bell, Shield, X } from 'lucide-react';
import { usePatientConsentSettings, useUpdatePatientConsent } from '@/hooks/api/use-patient-portal';
import { toast } from 'sonner';

export function ConsentBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [dataStorageConsent, setDataStorageConsent] = useState(false);
  
  const { data: consentSettings, isLoading } = usePatientConsentSettings();
  const updateConsent = useUpdatePatientConsent();

  useEffect(() => {
    // Auto-dismiss if not first login
    if (consentSettings && !consentSettings.isFirstLogin) {
      setDismissed(true);
    }
  }, [consentSettings]);

  const handleSaveConsent = async () => {
    try {
      await updateConsent.mutateAsync({
        whatsappConsent,
        dataStorageConsent,
      });

      toast.success('Your privacy preferences have been updated.');

      setDismissed(true);
    } catch (_error) {
      toast.error('Failed to save consent preferences');
    }
  };

  if (isLoading || dismissed || !consentSettings?.isFirstLogin) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Privacy & Consent</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Welcome to the Patient Portal! Please review and accept our privacy preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox
              id="whatsapp"
              checked={whatsappConsent}
              onCheckedChange={(checked) => setWhatsappConsent(!!checked)}
            />
            <div className="space-y-1 flex-1">
              <label
                htmlFor="whatsapp"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                WhatsApp Notifications
              </label>
              <p className="text-sm text-muted-foreground">
                Receive appointment reminders and health updates via WhatsApp
              </p>
            </div>
            <Bell className="h-4 w-4 text-muted-foreground mt-1" />
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4">
            <Checkbox
              id="storage"
              checked={dataStorageConsent}
              onCheckedChange={(checked) => setDataStorageConsent(!!checked)}
            />
            <div className="space-y-1 flex-1">
              <label
                htmlFor="storage"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Data Storage Consent
              </label>
              <p className="text-sm text-muted-foreground">
                I consent to storing my health data securely for medical purposes
              </p>
            </div>
            <Shield className="h-4 w-4 text-muted-foreground mt-1" />
          </div>

          <p className="text-xs text-muted-foreground">
            You can change these preferences anytime in your profile settings.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDismissed(true)}
            className="flex-1"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleSaveConsent}
            disabled={updateConsent.isPending}
            className="flex-1"
          >
            {updateConsent.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
