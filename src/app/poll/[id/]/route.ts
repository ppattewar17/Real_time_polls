import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { PollResults } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pollId = params.id;

    // Fetch poll with options and votes
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: true,
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Calculate results
    const totalVotes = poll.options.reduce(
      (sum, option) => sum + option.votes.length,
      0
    );

    const results = poll.options.map(option => ({
      optionId: option.id,
      text: option.text,
      voteCount: option.votes.length,
      percentage: totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0,
    }));

    // Check if user has already voted
    const fingerprint = request.headers.get('x-fingerprint') || null;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    let userVote: string | null = null;
    if (fingerprint) {
      const existingVote = await prisma.vote.findFirst({
        where: {
          pollId,
          OR: [
            { fingerprint },
            { ipAddress },
          ],
        },
      });
      userVote = existingVote?.optionId || null;
    }

    const response: PollResults = {
      poll,
      results,
      totalVotes,
      userVote,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching poll:', error);
    return NextResponse.json(
      { error: 'Failed to fetch poll' },
      { status: 500 }
    );
  }
}