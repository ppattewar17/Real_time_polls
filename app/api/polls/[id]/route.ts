import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { PollResults } from '@/types';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const fingerprint = request.headers.get('x-fingerprint');

        // Fetch poll with options and vote counts
        const poll = await prisma.poll.findUnique({
            where: { id: params.id },
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

        if (!poll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Check if user has voted
        let userVote = null;
        if (fingerprint) {
            const existingVote = await prisma.vote.findFirst({
                where: {
                    pollId: params.id,
                    fingerprint,
                },
            });
            if (existingVote) {
                userVote = existingVote.optionId;
            }
        }

        // Calculate results
        const totalVotes = poll._count.votes;
        const results = poll.options.map(option => ({
            optionId: option.id,
            text: option.text,
            voteCount: option._count.votes,
            percentage: totalVotes > 0 ? (option._count.votes / totalVotes) * 100 : 0,
        }));

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
