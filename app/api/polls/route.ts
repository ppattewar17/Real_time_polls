import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPollSchema = z.object({
    question: z.string().min(1).max(500),
    options: z.array(z.string().min(1).max(200)).min(2).max(10),
});

export async function GET(request: NextRequest) {
    try {
        // Fetch all polls with options and vote counts
        const polls = await prisma.poll.findMany({
            include: {
                options: {
                    include: {
                        _count: {
                            select: { votes: true },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 20, // Limit to 20 most recent polls
        });

        return NextResponse.json(polls);
    } catch (error) {
        console.error('Error fetching polls:', error);
        return NextResponse.json(
            { error: 'Failed to fetch polls' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { question, options } = createPollSchema.parse(body);

        // Create poll with options
        const poll = await prisma.poll.create({
            data: {
                question,
                options: {
                    create: options.map((text) => ({ text })),
                },
            },
            include: {
                options: true,
            },
        });

        return NextResponse.json(poll, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error creating poll:', error);
        return NextResponse.json(
            { error: 'Failed to create poll' },
            { status: 500 }
        );
    }
}
