import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // Try to write a test document to check if Firestore is enabled
    const testDocRef = doc(db, '_test', 'connection-check');
    const testData = {
      timestamp: new Date().toISOString(),
      check: true,
    };

    try {
      // Try to write
      await setDoc(testDocRef, testData);
      
      // Try to read
      const docSnap = await getDoc(testDocRef);
      
      // Clean up
      await deleteDoc(testDocRef);

      return NextResponse.json({
        enabled: true,
        message: 'Firestore is enabled and working correctly',
      });
    } catch (error: any) {
      // Check if it's a permission error
      if (error.code === 'permission-denied' || error.message?.includes('PERMISSION_DENIED')) {
        return NextResponse.json({
          enabled: false,
          error: 'Permission denied. Please check Firestore Security Rules.',
          code: 'permission-denied',
        });
      }
      
      // Check if it's an API not enabled error
      if (error.message?.includes('API has not been used') || 
          error.message?.includes('is disabled') ||
          error.code === 7) {
        return NextResponse.json({
          enabled: false,
          error: 'Firestore API is not enabled. Please enable it in Google Cloud Console.',
          code: 'api-not-enabled',
          link: 'https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=medica-issuev2',
        });
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Firestore check error:', error);
    
    return NextResponse.json({
      enabled: false,
      error: error.message || 'Unknown error',
      code: error.code || 'unknown',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to check Firestore status',
    instructions: 'Send a POST request to check if Firestore is enabled',
  });
}

