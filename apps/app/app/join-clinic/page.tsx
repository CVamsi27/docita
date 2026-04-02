'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Mail, Phone, MapPin, ArrowLeft, LogOut } from 'lucide-react';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Textarea } from '@workspace/ui/components/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { Badge } from '@workspace/ui/components/badge';
import { toast } from 'sonner';
import { typedApi } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { ThemeToggle } from '@workspace/ui/components/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { PageTransitionLoader } from '@/components/common/loaders/page-transition-loader';

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  canJoin: boolean;
  existingRequestStatus: string | null;
}

export default function JoinClinicPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [requestedRole, setRequestedRole] = useState<string>('DOCTOR');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const results = await typedApi.clinics.searchForJoin(searchQuery);
      setClinics(results as Clinic[]);

      if ((results as Clinic[]).length === 0) {
        toast.info('No clinics found matching your search');
      }
    } catch (error) {
      toast.error('Failed to search clinics. Please try again.');
      logger.error('Search error', { error });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedClinic) return;

    setIsSubmitting(true);
    try {
      await typedApi.joinRequests.create({
        clinicId: selectedClinic.id,
        requestedRole,
        message: message.trim() || undefined,
      });

      toast.success('Join request submitted successfully!');
      setSelectedClinic(null);
      setIsRedirecting(true);
      router.replace('/join-request-status');
    } catch (error) {
      toast.error('Failed to submit join request. Please try again.');
      logger.error('Submit error', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (isRedirecting) {
    return (
      <PageTransitionLoader
        title="Request submitted"
        description="Taking you to request status..."
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign out
        </Button>
        <ThemeToggle />
      </div>
      <div className="container max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/choose-path')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Choose Path
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Join a Clinic</h1>
          <p className="text-muted-foreground">
            Search for your clinic by name, email, or referral code
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by clinic name, email, or code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {clinics.length === 0 && searchQuery && !isSearching && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No clinics found. Try searching with a different term.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{clinic.name}</h3>
                      {clinic.existingRequestStatus && (
                        <Badge variant="secondary" className="mt-1">
                          Request {clinic.existingRequestStatus}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground ml-11">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{clinic.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{clinic.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{clinic.address}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedClinic(clinic)}
                  disabled={!clinic.canJoin}
                  className="md:min-w-[150px]"
                >
                  {clinic.canJoin ? 'Request to Join' : 'Request Pending'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={!!selectedClinic} onOpenChange={() => setSelectedClinic(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request to Join {selectedClinic?.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Role</label>
                <Select value={requestedRole} onValueChange={setRequestedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the role you will have in this clinic
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Message to Admin <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Textarea
                  placeholder="Introduce yourself or explain why you want to join..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/500
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedClinic(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
