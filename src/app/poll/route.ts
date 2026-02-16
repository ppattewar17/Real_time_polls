import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPollSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500),
  options: z
    .array(z.string().min(1).max(200))
    .min(2, 'At least 2 options required')
    .max(10, 'Maximum 10 options allowed'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = createPollSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { question, options } = validation.data;

    // Remove duplicates and empty options
    const uniqueOptions = [...new Set(options)]
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);

    if (uniqueOptions.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 unique options required' },
        { status: 400 }
      );
    }

    // Create poll with options
    const poll = await prisma.poll.create({
      data: {
        question: question.trim(),
        options: {
          create: uniqueOptions.map(text => ({ text })),
        },
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json(poll, { status: 201 });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}