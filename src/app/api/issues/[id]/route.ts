import { NextRequest, NextResponse } from 'next/server';
import { getIssue, updateIssue, getComponent } from '@/lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const issue = await getIssue(params.id);
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    
    return NextResponse.json(issue);
  } catch (error: any) {
    console.error('Error fetching issue:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to fetch issue';
    let statusCode = 500;
    
    if (error.message?.includes('offline') || error.message?.includes('client is offline')) {
      errorMessage = 'Firestore is offline. Please check your internet connection and Firestore security rules.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('permission-denied') || error.code === 'permission-denied') {
      errorMessage = 'Permission denied. Please check Firestore security rules in Firebase Console.';
      statusCode = 403; // Forbidden
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: statusCode });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if issue exists
    const existingIssue = await getIssue(params.id);
    if (!existingIssue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (reporterName !== undefined) updateData.reporterName = reporterName;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (closedBy !== undefined) updateData.closedBy = closedBy;
    if (parentIssueId !== undefined) updateData.parentIssueId = parentIssueId || null;
    if (hospital !== undefined) updateData.hospital = hospital;
    if (department !== undefined) updateData.department = department;

    // If componentId changed, update componentPath
    if (componentId !== undefined) {
      updateData.componentId = componentId || null;
      if (componentId) {
        const component = await getComponent(componentId);
        if (component) {
          updateData.componentPath = component.path;
        } else {
          updateData.componentPath = [];
        }
      } else {
        updateData.componentPath = [];
      }
    }

    const issue = await updateIssue(params.id, updateData);
    
    // Verify the update was successful by fetching again
    const verifiedIssue = await getIssue(params.id);
    if (!verifiedIssue) {
      console.error('Issue was not found after update - possible sync issue');
      return NextResponse.json({ 
        error: 'Update may have failed - issue not found after update',
        issue 
      }, { status: 500 });
    }
    
    return NextResponse.json(verifiedIssue);
  } catch (error: any) {
    console.error('Error updating issue:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'Failed to update issue';
    let statusCode = 500;
    
    if (error.message?.includes('offline') || error.message?.includes('client is offline')) {
      errorMessage = 'Firestore is offline. Please check your internet connection and Firestore security rules.';
      statusCode = 503;
    } else if (error.message?.includes('permission-denied') || error.code === 'permission-denied') {
      errorMessage = 'Permission denied. Please check Firestore security rules in Firebase Console.';
      statusCode = 403;
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: statusCode });
  }
}

