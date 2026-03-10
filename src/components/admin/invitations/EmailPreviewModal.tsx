import { ROLE_OPTIONS, buildInviteUrl } from '@/lib/admin/invitation-types';
import { config } from '@/lib/config';
import { AlertCircle, Eye, X } from 'lucide-react';

export function EmailPreviewModal({
  recipientEmail,
  firstName,
  storeName,
  role,
  onClose,
}: {
  recipientEmail: string;
  firstName: string;
  storeName: string;
  role: string;
  onClose: () => void;
}) {
  const previewInviteUrl = buildInviteUrl('example-token-preview');
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
  const storeText = storeName ? ` at ${storeName}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Eye className="w-4.5 h-4.5 text-coach-gold" />
            <h2 className="text-base font-semibold text-gray-900">Invitation Email Preview</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Email mockup */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div className="text-xs text-gray-400 space-y-1 mb-4 pb-4 border-b border-gray-100">
            <div><span className="font-medium text-gray-600">To:</span> {recipientEmail || 'recipient@example.com'}</div>
            <div><span className="font-medium text-gray-600">Subject:</span> {"You've been invited to join Coach Pulse"}</div>
          </div>

          {/* Email body */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-coach-mahogany px-6 py-5 text-center">
              <div className="inline-flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-coach-gold flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <span className="text-white font-semibold text-base tracking-wide">Coach Pulse</span>
              </div>
              <p className="text-white/70 text-xs mt-1">Your retail training platform</p>
            </div>

            {/* Body */}
            <div className="bg-white px-6 py-6 space-y-4">
              <p className="text-sm text-gray-800">{greeting}</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {"You've"} been invited to join <strong>Coach Pulse</strong> as a <strong>{roleLabel}</strong>{storeText}.
                Coach Pulse is your team&apos;s hub for product knowledge, training, and daily inspiration.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Click the button below to create your account and get started. This invitation expires in <strong>7 days</strong>.
              </p>

              <div className="text-center py-2">
                <a
                  href={previewInviteUrl}
                  className="inline-block bg-coach-gold hover:bg-coach-gold/90 text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
                  onClick={e => e.preventDefault()}
                >
                  Accept Invitation
                </a>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Or copy this link into your browser:</p>
                <code className="text-xs text-coach-gold break-all">{previewInviteUrl}</code>
              </div>

              <p className="text-xs text-gray-400 text-center">
                If you weren&apos;t expecting this invitation, you can ignore this email.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Sent via Coach Pulse Admin · {config.adminAppUrl}
              </p>
            </div>
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            The actual email styling is determined by your Supabase email template. This preview shows the expected content and structure.
          </p>
        </div>
      </div>
    </div>
  );
}
