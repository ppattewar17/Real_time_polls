import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  
  return NextResponse.json({
    message: 'Socket.IO endpoint - use custom server for Socket.IO in production',
    instructions: 'See server.js for Socket.IO setup',
  });
}