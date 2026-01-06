import { NextRequest, NextResponse } from 'next/server';
import { getHospitals, createHospital } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const hospitals = await getHospitals();
    return NextResponse.json(hospitals);
  } catch (error: any) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, province, code, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const hospital = await createHospital({ 
      name, 
      province: province || null, 
      code: code || null, 
      address: address || null 
    });
    return NextResponse.json(hospital, { status: 201 });
  } catch (error: any) {
    console.error('Error creating hospital:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

