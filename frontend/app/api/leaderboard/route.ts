import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_PUBLIC_URL || 'https://api.monadworld.xyz';

export async function GET(request: Request) {
  try {
    // Get URL parameters from the request
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    console.log('[Frontend API] Connecting to backend:', BACKEND_URL);
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/leaderboard?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Don't cache the response
    });
    
    if (!response.ok) {
      console.error('[Frontend API] Backend responded with status:', response.status);
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching leaderboard data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leaderboard data',
        message: error.message,
        backendUrl: BACKEND_URL
      },
      { status: 500 }
    );
  }
} 