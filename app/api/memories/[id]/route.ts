import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MemoryService } from '@/lib/memory/memory-service';
async function userFor() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const user = await userFor(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const { id } = await params; const body = await request.json(); return NextResponse.json({ memory: await MemoryService.update(user.id, id, { content: body.content, is_active: body.is_active }) }); }
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { const user = await userFor(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const { id } = await params; await MemoryService.forget(user.id, id); return new NextResponse(null, { status: 204 }); }
