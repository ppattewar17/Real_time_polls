// Temporary in-memory store for polls (replace with proper database when MongoDB replica set is configured)
export interface Poll {
  id: string;
  question: string;
  createdAt: string;
  updatedAt: string;
  options: Option[];
  _count: {
    votes: number;
  };
}

export interface Option {
  id: string;
  text: string;
  _count: {
    votes: number;
  };
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  ipAddress: string;
  fingerprint: string;
  votedAt: string;
}

// In-memory stores
export const pollsStore: Poll[] = [];
export const votesStore: Vote[] = [];
let pollIdCounter = 1;
let voteIdCounter = 1;

export function createPoll(question: string, options: string[]): Poll {
  const poll: Poll = {
    id: `poll-${pollIdCounter++}`,
    question,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    options: options.map((text, index) => ({
      id: `option-${pollIdCounter}-${index}`,
      text,
      _count: { votes: 0 }
    })),
    _count: { votes: 0 }
  };

  pollsStore.push(poll);
  return poll;
}

export function getPoll(id: string): Poll | undefined {
  return pollsStore.find(p => p.id === id);
}

export function getAllPolls(): Poll[] {
  return pollsStore;
}

export function createVote(pollId: string, optionId: string, ipAddress: string, fingerprint: string): Vote {
  const vote: Vote = {
    id: `vote-${voteIdCounter++}`,
    pollId,
    optionId,
    ipAddress,
    fingerprint,
    votedAt: new Date().toISOString()
  };

  votesStore.push(vote);

  // Update vote counts
  const poll = getPoll(pollId);
  if (poll) {
    poll._count.votes++;
    const option = poll.options.find(o => o.id === optionId);
    if (option) {
      option._count.votes++;
    }
  }

  return vote;
}

export function hasVoted(pollId: string, ipAddress: string, fingerprint: string): boolean {
  return votesStore.some(v => 
    v.pollId === pollId && (v.ipAddress === ipAddress || v.fingerprint === fingerprint)
  );
}
