import { NextRequest, NextResponse } from 'next/server';
import { getIssues, createIssue, getComponent } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const componentId = searchParams.get('componentId');
    const type = searchParams.get('type') as 'internal' | 'external' | null;
    const parentIssueId = searchParams.get('parentIssueId');

    const filters: { status?: string; componentId?: string; type?: 'internal' | 'external'; parentIssueId?: string | null } = {};
    if (status) {
      filters.status = status;
    }
    if (componentId) {
      filters.componentId = componentId;
    }
    if (type) {
      filters.type = type;
    }
    if (parentIssueId !== null) {
      if (parentIssueId === 'null' || parentIssueId === '') {
        filters.parentIssueId = null;
      } else {
        filters.parentIssueId = parentIssueId;
      }
    }

    const issues = await getIssues(filters);
    return NextResponse.json(issues);
  } catch (error: any) {
    console.error('Error fetching issues:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      status, 
      priority, 
      componentId, 
      description,
      type,
      reporterName,
      assignedTo,
      closedBy,
      parentIssueId,
      hospital,
      department
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let componentPath: string[] = [];
    if (componentId) {
      const component = await getComponent(componentId);
      if (component) {
        componentPath = component.path;
      }
    }

    // If assignedTo is provided, set status to IN_PROGRESS
    const finalStatus = assignedTo ? 'IN_PROGRESS' : (status || 'OPEN');
    
    const issue = await createIssue({
      title,
      status: finalStatus,
      priority: priority || 'MED',
      componentId: componentId || null,
      componentPath,
      description,
      type: type || 'internal',
      reporterName,
      assignedTo,
      closedBy,
      parentIssueId: parentIssueId || null,
      hospital,
      department,
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error: any) {
    console.error('Error creating issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

