// src/components/support/SupportTicketModal.tsx
import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  X,
  ArrowLeft,
} from 'lucide-react';

interface SupportTicketData {
  type: string;
  subject: string;
  description: string;
  createdAt: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
}

interface SupportTicket {
  _id: string;
  user: string; // or userId
  issueType: string;
  subject: string;
  description: string;
  status: SupportTicketData['status'];
  createdAt: string;
  updatedAt: string;
}

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<SupportTicketData, 'createdAt' | 'status'>) => Promise<void>;
}

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [activeView, setActiveView] = useState<'new' | 'existing'>('new'); // ✅ New state

  // New Ticket Form State
  const [issueType, setIssueType] = useState<string>('Bug Report');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Existing Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Reset form & tickets when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubject('');
      setDescription('');
      setIssueType('Bug Report');
      setError(null);
      setSuccess(false);
      setTickets([]);
      setTicketError(null);
      setActiveView('new'); // Default to new ticket
    }
  }, [isOpen]);

  // Fetch existing tickets
  const fetchTickets = async () => {
    setLoadingTickets(true);
    setTicketError(null);
    try {
      // Replace with your actual API endpoint
      const res = await fetch('/api/support/tickets', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // if needed
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setTicketError(err.message || 'Failed to load tickets.');
    } finally {
      setLoadingTickets(false);
    }
  };

  // Submit new ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type : issueType,
        subject,
        description,
      });

      setSuccess(true);
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to submit ticket. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #161b22 0%, #1e252d 50%, #24292f 100%)',
        }}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('new')}
              className={`text-xs px-2 py-1 rounded ${
                activeView === 'new'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              New Ticket
            </button>
            <button
              onClick={() => {
                setActiveView('existing');
                if (tickets.length === 0 && !loadingTickets) {
                  fetchTickets();
                }
              }}
              className={`text-xs px-2 py-1 rounded ${
                activeView === 'existing'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Existing Tickets
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold rounded-full p-1 hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {activeView === 'new' ? (
            <>
              {success ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-lg font-semibold text-green-300">Ticket Submitted!</p>
                  <p className="text-gray-400 mt-2 text-sm">
                    We’ll respond within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 flex-shrink-0 h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Issue Type
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    >
                      <option>Bug Report</option>
                      <option>Feature Request</option>
                      <option>Access Issue</option>
                      <option>Billing</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Unable to deploy ArgoCD"
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Steps to reproduce, error logs, account ID, region, etc."
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder:text-gray-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition ${
                        isSubmitting
                          ? 'bg-gray-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:opacity-90 shadow-md'
                      }`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Existing Tickets View */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">Your Support Tickets</h4>
                <button
                  onClick={() => setActiveView('new')}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition"
                >
                  <ArrowLeft size={14} className="inline mr-1" /> New Ticket
                </button>
              </div>

              {loadingTickets ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-gray-800/50 animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : ticketError ? (
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 flex-shrink-0 h-4 w-4" />
                  <span>{ticketError}</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No tickets found.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-cyan-500/30 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-white truncate">
                          {ticket.subject}
                        </h5>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            ticket.status === 'Resolved'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : ticket.status === 'In Progress'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : ticket.status === 'Pending'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>
                          <span className="text-gray-500">Type:</span>{' '}
                          <span className="text-cyan-300">{ticket.issueType}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>{' '}
                          <span>
                            {new Date(ticket.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {ticket.updatedAt &&
                          ticket.updatedAt !== ticket.createdAt && (
                            <div>
                              <span className="text-gray-500">Updated:</span>{' '}
                              <span>
                                {new Date(ticket.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTicketModal;
