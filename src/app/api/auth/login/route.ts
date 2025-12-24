import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const user = await verifyUser(username, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // In a real app, you'd create a session or JWT token here
    // For simplicity, we'll just return the user data
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

