import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Secure cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
};

// Parse our secure storage cookie
const getSecureStorage = () => {
  const cookieStore = cookies();
  const storageCookie = cookieStore.get('secureAppStorage');
  
  if (!storageCookie) {
    return {};
  }
  
  try {
    return JSON.parse(storageCookie.value);
  } catch (error) {
    console.error('Error parsing secure storage cookie:', error);
    return {};
  }
};

// Set data to secure storage
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, key, data } = body;
    
    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }
    
    const secureStorage = getSecureStorage();
    
    if (action === 'set') {
      // Store data
      secureStorage[key] = data;
    } else if (action === 'remove') {
      // Remove data
      delete secureStorage[key];
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    
    // Update the cookie with new storage data
    cookies().set('secureAppStorage', JSON.stringify(secureStorage), COOKIE_OPTIONS);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in storage API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Get data from secure storage
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const key = searchParams.get('key');
    
    if (action !== 'get') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    
    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }
    
    const secureStorage = getSecureStorage();
    const data = secureStorage[key];
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in storage API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}