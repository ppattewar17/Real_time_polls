export interface Poll {
  id: string;
  question: string;
  createdAt: Date;
  updatedAt: Date;
  options: Option[];
  votes?: Vote[];
}

export interface Option {
  id: string;
  text: string;
  pollId: string;
  votes?: Vote[];
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  ipAddress: string;
  fingerprint: string;
  votedAt: Date;
}

export interface CreatePollRequest {
  question: string;
  options: string[];
}

export interface VoteRequest {
  pollId: string;
  optionId: string;
  fingerprint: string;
}

export interface PollResults {
  poll: Poll;
  results: OptionResult[];
  totalVotes: number;
  userVote: string | null;
}

export interface OptionResult {
  optionId: string;
  text: string;
  voteCount: number;
  percentage: number;
}

export interface ServerToClientEvents {
  voteUpdate: (data: PollResults) => void;
  pollUpdate: (poll: Poll) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  joinPoll: (pollId: string) => void;
  leavePoll: (pollId: string) => void;
  vote: (data: VoteRequest) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  pollId?: string;
  fingerprint?: string;
}