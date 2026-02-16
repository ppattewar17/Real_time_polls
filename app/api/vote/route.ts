import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp, checkRateLimit, createRateLimitKey } from '@/lib/rateLimit';
import { z } from 'zod';
import type { PollResults } from '@/types';

const voteSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
  fingerprint: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = voteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { pollId, optionId, fingerprint } = validation.data;

    // Get client IP
    const ipAddress = getClientIp(request.headers);

    // ANTI-ABUSE MECHANISM #1: IP-Based Rate Limiting
    const rateLimitKey = createRateLimitKey(ipAddress, pollId);
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before voting again.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // ANTI-ABUSE MECHANISM #2: Browser Fingerprint + IP Check
    const existingVote = await prisma.vote.findFirst({
      where: {
        pollId,
        OR: [
          { fingerprint },
          { ipAddress },
        ],
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted in this poll' },
        { status: 409 }
      );
    }

    // Verify poll and option exist
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const optionExists = poll.options.some(opt => opt.id === optionId);
    if (!optionExists) {
      return NextResponse.json(
        { error: 'Invalid option' },
        { status: 400 }
      );
    }

    // Create vote
    await prisma.vote.create({
      data: {
        pollId,
        optionId,
        ipAddress,
        fingerprint,
      },
    });

    // Fetch updated poll results
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    if (!updatedPoll) {
      throw new Error('Poll not found after vote');
    }

    // Calculate results
    const totalVotes = updatedPoll._count.votes;
    const results = updatedPoll.options.map(option => ({
      optionId: option.id,
      text: option.text,
      voteCount: option._count.votes,
      percentage: totalVotes > 0 ? (option._count.votes / totalVotes) * 100 : 0,
    }));

    const response: PollResults = {
      poll: updatedPoll,
      results,
      totalVotes,
      userVote: optionId,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
