import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbackRequestByToken, submitFeedbackRequest } from '../services/supabaseApi';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import Logo from '../components/common/Logo';
import toast from 'react-hot-toast';

const INTERACTION_LABEL = {
  complaint: 'Complaint Resolution', walk_in: 'Branch Visit', enquiry: 'Enquiry',
  consultation: 'Consultation', phone_call: 'Phone Call', application: 'Application',
  follow_up: 'Follow-up', other: 'Service',
};

const INVALID_REASON_TEXT = {
  already_completed: 'This feedback link has already been used, thank you for your response.',
  expired: 'This feedback link has expired.',
  not_found: 'This feedback link is not valid.',
};

export default function FeedbackFormPage() {
  const { token } = useParams();
  const [form, setForm] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getFeedbackRequestByToken(token);
        if (!data.valid) setError(INVALID_REASON_TEXT[data.reason] || 'This feedback link is not valid.');
        else setForm(data);
      } catch {
        setError('This feedback link is not valid.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!rating) return toast.error('Please select a rating');
    setSubmitting(true);
    try {
      const { data } = await submitFeedbackRequest(token, rating, comment);
      if (!data.success) {
        setError(data.message);
      } else {
        setSubmitted(true);
      }
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-ticano-bg-light flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-ticano-red border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-ticano-bg-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="flex justify-center mb-4"><AlertTriangle size={44} className="text-ticano-red" /></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Link Invalid</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-ticano-bg-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="flex justify-center mb-4"><CheckCircle size={52} className="text-ticano-red" /></div>
        <h2 className="text-2xl font-bold text-ticano-charcoal mb-2">
          {rating >= 4 ? 'Thank You!' : 'Feedback Received'}
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {rating >= 4
            ? 'We are delighted you had a great experience with Ticano!'
            : 'A Service Manager will contact you within 24 hours. We appreciate your patience.'}
        </p>
        <div className="mt-6">
          <div className="w-16 h-1 bg-ticano-red rounded mx-auto"></div>
        </div>
        <p className="text-xs text-gray-400 mt-4">Ticano, Botswana</p>
      </div>
    </div>
  );

  const starLabels = ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];

  return (
    <div className="min-h-screen bg-ticano-bg-light flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo size={32} withTagline className="items-center" taglineClassName="text-gray-400 text-center" />
          </div>
          <h1 className="text-xl font-bold text-ticano-charcoal">
            {form?.clientName ? `Hi ${form.clientName.split(' ')[0]}, rate your experience` : 'Rate Your Experience'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {form?.branchName ? `${form.branchName} Branch · ` : ''}
            {INTERACTION_LABEL[form?.interactionType] || 'Service'}
            {form?.staffName ? ` with ${form.staffName}` : ''}
          </p>
        </div>

        {/* Stars */}
        <div className="text-center mb-2">
          <p className="text-sm font-medium text-gray-600 mb-3">How would you rate your experience?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                style={{ color: star <= (hoverRating || rating) ? '#FFC107' : '#D1D5DB' }}>
                ★
              </button>
            ))}
          </div>
          {(hoverRating || rating) > 0 && (
            <p className="text-sm font-semibold text-ticano-red mt-2">{starLabels[hoverRating || rating]}</p>
          )}
        </div>

        {/* Comment */}
        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Comments (Optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
            placeholder="Tell us about your experience..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ticano-red resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={submitting || !rating}
          className="w-full mt-4 py-3 bg-ticano-red hover:bg-ticano-red-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">Your feedback helps us improve, this link can only be used once.</p>
      </div>
    </div>
  );
}
