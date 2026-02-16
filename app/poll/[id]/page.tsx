'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getOrGenerateFingerprint } from '@/lib/fingerprint';
import type { PollResults } from '@/types';

export default function PollPage() {
  const params = useParams();
  const router = useRouter();
  const [pollData, setPollData] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fingerprint, setFingerprint] = useState('');

  useEffect(() => {
    // Generate fingerprint
    getOrGenerateFingerprint().then(setFingerprint);
  }, []);

  useEffect(() => {
    if (params.id && fingerprint) {
      fetchPoll();
    }
  }, [params.id, fingerprint]);

  const fetchPoll = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (fingerprint) {
        headers['x-fingerprint'] = fingerprint;
      }

      const response = await fetch(`/api/polls/${params.id}`, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Poll not found');
          return;
        }
        throw new Error('Failed to fetch poll');
      }

      const data = await response.json();
      setPollData(data);

      // Set selected option if user has already voted
      if (data.userVote) {
        setSelectedOption(data.userVote);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedOption || !pollData || !fingerprint) return;

    setVoting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: pollData.poll.id,
          optionId: selectedOption,
          fingerprint,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to vote');
      }

      const updatedData = await response.json();
      setPollData(updatedData);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !pollData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Poll not found'}</p>
          <Button onClick={() => router.push('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const { poll, results, totalVotes, userVote } = pollData;
  const hasVoted = !!userVote;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Back to Home
          </Button>
        </div>

        <Card>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {poll.question}
            </h1>
            <p className="text-gray-600">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </p>
          </div>

          <div className="space-y-4">
            {results.map((result) => {
              const isSelected = selectedOption === result.optionId;
              const percentage = result.percentage || 0;

              return (
                <button
                  key={result.optionId}
                  onClick={() => !hasVoted && setSelectedOption(result.optionId)}
                  disabled={hasVoted}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${hasVoted
                      ? userVote === result.optionId
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 bg-gray-50'
                      : isSelected
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50 cursor-pointer'
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">
                      {result.text}
                      {userVote === result.optionId && ' ✓'}
                    </span>
                    {hasVoted && (
                      <span className="text-sm font-semibold text-gray-700">
                        {percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {hasVoted && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        {result.voteCount} {result.voteCount === 1 ? 'vote' : 'votes'}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {!hasVoted && (
            <div className="mt-6">
              <Button
                onClick={handleVote}
                disabled={!selectedOption || voting}
                className="w-full"
                size="lg"
              >
                {voting ? 'Submitting Vote...' : 'Submit Vote'}
              </Button>
              <p className="mt-3 text-center text-sm text-gray-500">
                Select an option above to vote
              </p>
            </div>
          )}

          {hasVoted && (
            <p className="mt-6 text-center text-sm text-green-600 font-medium">
              Thanks for voting! Results update in real-time.
            </p>
          )}
        </Card>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Share this poll: {typeof window !== 'undefined' && window.location.href}
          </p>
        </div>
      </div>
    </div>
  );
}
