import { NextRequest, NextResponse } from 'next/server';
import { getComponent, updateComponent } from '@/lib/firestore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name } = body;

    const existingComponent = await getComponent(params.id);
    if (!existingComponent) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) {
      updateData.name = name;
      // Recompute path if name changed
      if (existingComponent.parentId) {
        const parent = await getComponent(existingComponent.parentId);
        if (parent) {
          updateData.path = [...parent.path, name];
        } else {
          updateData.path = [name];
        }
      } else {
        updateData.path = [name];
      }
    }

    const component = await updateComponent(params.id, updateData);
    return NextResponse.json(component);
  } catch (error: any) {
    console.error('Error updating component:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

