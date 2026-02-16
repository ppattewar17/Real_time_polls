'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getOrGenerateFingerprint } from '@/lib/fingerprint';
import type { PollResults } from '@/types';

export default function PollPage() {
  const params = useParams();
  const pollId = params.id as string;

  const [pollData, setPollData] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    // Generate fingerprint
    getOrGenerateFingerprint().then(setFingerprint);

    // Initialize Socket.IO
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO');
      socketInstance.emit('joinPoll', pollId);
    });

    socketInstance.on('voteUpdate', (data: PollResults) => {
      console.log('Received vote update:', data);
      setPollData(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('leavePoll', pollId);
      socketInstance.disconnect();
    };
  }, [pollId]);

  useEffect(() => {
    // Fetch initial poll data
    fetchPoll();
    
    // Generate share link
    if (typeof window !== 'undefined') {
      setShareLink(window.location.href);
    }
  }, [pollId, fingerprint]);

  const fetchPoll = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (fingerprint) {
        headers['x-fingerprint'] = fingerprint;
      }

      const response = await fetch(`/api/polls/${pollId}`, { headers });

      if (!response.ok) {
        throw new Error('Poll not found');
      }

      const data = await response.json();
      setPollData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!fingerprint || voting || pollData?.userVote) return;

    setVoting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId, fingerprint }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to vote');
      }

      const data = await response.json();
      setPollData(data);

      // Broadcast vote to all connected clients
      if (socket) {
        socket.emit('voteUpdate', data);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVoting(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard!');
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
        <Card className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Poll Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This poll does not exist.'}</p>
          <Button onClick={() => window.location.href = '/'}>
            Create New Poll
          </Button>
        </Card>
      </div>
    );
  }

  const { poll, results, totalVotes, userVote } = pollData;
  const hasVoted = !!userVote;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {poll.question}
          </h1>
          <p className="text-gray-600">
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </p>
        </div>

        <Card className="mb-6">
          <div className="space-y-4">
            {results.map((result) => {
              const isSelected = userVote === result.optionId;
              const percentage = result.percentage || 0;

              return (
                <button
                  key={result.optionId}
                  onClick={() => !hasVoted && handleVote(result.optionId)}
                  disabled={hasVoted || voting}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                    hasVoted
                      ? isSelected
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 bg-gray-50'
                      : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50 cursor-pointer'
                  } ${voting ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">
                      {result.text}
                      {isSelected && ' ✓'}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {result.voteCount} {result.voteCount === 1 ? 'vote' : 'votes'}
                  </p>
                </button>
              );
            })}
          </div>

          {!hasVoted && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Select an option to vote
            </p>
          )}

          {hasVoted && (
            <p className="mt-6 text-center text-sm text-green-600 font-medium">
              Thanks for voting! Results update in real-time.
            </p>
          )}
        </Card>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-3">Share This Poll</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <Button onClick={copyShareLink}>Copy Link</Button>
          </div>
        </div>

        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Create New Poll
          </Button>
        </div>
      </div>
    </div>
  );
}