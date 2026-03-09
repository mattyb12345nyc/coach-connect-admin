'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Loader2,
  Lock,
  User,
  Store,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Invitation {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
  store_id: string | null;
  stores: {
    store_number: string;
    store_name: string;
    city: string;
    state: string;
  } | null;
  status: string;
  expires_at: string;
}

interface StoreOption {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
}

type PageState = 'loading' | 'form' | 'invalid' | 'expired' | 'success';

export default function InviteRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <InviteRegistrationContent />
    </Suspense>
  );
}

function InviteRegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || searchParams.get('invite');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [storeId, setStoreId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  const isNonAdmin = invitation?.role !== 'admin';

  const validateToken = useCallback(async () => {
    if (!token) {
      setErrorMessage('No invitation token provided.');
      setPageState('invalid');
      return;
    }

    try {
      const res = await fetch(`/api/register?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410 || data?.error?.toLowerCase().includes('expired')) {
          setPageState('expired');
        } else {
          setErrorMessage(data?.error || 'Invalid or expired invitation.');
          setPageState('invalid');
        }
        return;
      }

      setInvitation(data);
      if (data.store_id) {
        setStoreId(data.store_id);
      }
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
      if (fullName) setName(fullName);
      setPageState('form');
    } catch {
      setErrorMessage('Failed to validate invitation. Please try again.');
      setPageState('invalid');
    }
  }, [token]);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores?status=OPEN');
      if (res.ok) {
        const data = await res.json();
        setStores(Array.isArray(data) ? data : data.stores ?? []);
      }
    } catch {
      // Store list is non-critical; form still works with pre-selected store
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  useEffect(() => {
    if (pageState !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pageState, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !token) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: invitation.email,
          name: name.trim(),
          store_id: storeId || null,
          avatar_url: avatarUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Registration failed.');
      }

      setPageState('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed.');
      setSubmitting(false);
    }
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default' as const;
      case 'manager': return 'warning' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md mb-4 ring-2 ring-primary/20">
            <Image
              src="/logo.png"
              alt="Coach Pulse"
              width={56}
              height={56}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Coach Pulse
          </h1>
        </div>

        {pageState === 'loading' && <LoadingCard />}
        {pageState === 'invalid' && <ErrorCard message={errorMessage} />}
        {pageState === 'expired' && <ExpiredCard />}
        {pageState === 'success' && <SuccessCard countdown={countdown} />}

        {pageState === 'form' && invitation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complete Your Profile</CardTitle>
              <p className="text-sm text-muted-foreground">
                You&apos;ve been invited to join Coach Pulse. Fill out the details below to get started.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" required>Name</Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    icon={<User className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={invitation.email}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed"
                    icon={<Lock className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>
                    <Badge variant={roleBadgeVariant(invitation.role)} size="lg">
                      {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                    </Badge>
                  </div>
                </div>

                {isNonAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="store" required>Store</Label>
                    <Select value={storeId} onValueChange={setStoreId} required>
                      <SelectTrigger id="store">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select a store" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.store_number} — {s.store_name} ({s.city}, {s.state})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {invitation.stores && (
                      <p className="text-xs text-muted-foreground">
                        Pre-assigned: {invitation.stores.store_name} ({invitation.stores.city}, {invitation.stores.state})
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="avatar"
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarError(false);
                    }}
                    icon={<ImageIcon className="h-4 w-4" />}
                  />
                  {avatarUrl && !avatarError && (
                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarUrl}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                          onError={() => setAvatarError(true)}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">Preview</span>
                    </div>
                  )}
                  {avatarError && (
                    <p className="text-xs text-destructive">
                      Could not load image. Please check the URL.
                    </p>
                  )}
                </div>

                {errorMessage && pageState === 'form' && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={submitting}
                  loadingText="Creating account..."
                  disabled={!name.trim() || (isNonAdmin && !storeId)}
                >
                  Complete Registration
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Validating your invitation...</p>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Invalid Invitation
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {message || 'This invitation link is invalid or has already been used.'}
        </p>
        <Button variant="outline" asChild>
          <a href="/">
            Back to Home
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function ExpiredCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-warning" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Invitation Expired
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          This invitation has expired. Please contact your administrator for a new invite.
        </p>
        <Button variant="outline" asChild>
          <a href="/">
            Back to Home
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function SuccessCard({ countdown }: { countdown: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center mb-4',
          'bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/20'
        )}>
          <CheckCircle className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Welcome to Coach Pulse!
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your account has been created successfully.
        </p>
        <div className="text-xs text-muted-foreground">
          Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
        </div>
      </CardContent>
    </Card>
  );
}
