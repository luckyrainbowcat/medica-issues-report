import { NextRequest, NextResponse } from 'next/server';
import { getComponents, createComponent, getComponent } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const components = await getComponents();
    return NextResponse.json(components);
  } catch (error: any) {
    console.error('Error fetching components:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let path: string[] = [name];

    if (parentId) {
      const parent = await getComponent(parentId);
      if (!parent) {
        return NextResponse.json({ error: 'Parent component not found' }, { status: 404 });
      }
      path = [...parent.path, name];
    }

    const component = await createComponent({
      name,
      parentId: parentId || null,
      path,
    });

    return NextResponse.json(component, { status: 201 });
  } catch (error: any) {
    console.error('Error creating component:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

