import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MemoryService, type MemoryType } from '@/lib/memory/memory-service';

async function userFor() { const s = await createClient(); const { data: { user } } = await s.auth.getUser(); return user; }
export async function GET(request: NextRequest) { const user = await userFor(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ memories: await MemoryService.search(user.id, request.nextUrl.searchParams.get('q') || '', Number(request.nextUrl.searchParams.get('limit') || 100)) }); }
export async function POST(request: NextRequest) { const user = await userFor(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const body = await request.json(); if (!body.content || !['fact','preference','conversation','knowledge','temporary'].includes(body.memoryType)) return NextResponse.json({ error: 'Valid content and memoryType are required.' }, { status: 400 }); const memory = await MemoryService.store(user.id, body.content, body.memoryType as MemoryType, body.conversationId, body.metadata); return NextResponse.json({ memory }, { status: 201 }); }
