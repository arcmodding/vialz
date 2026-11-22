import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Counts the click, then sends the visitor on. The destination comes from the database and must be https.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = new URL('/', request.url);
  if (!UUID.test(id)) return NextResponse.redirect(home);

  const supabase = await createClient();
  const { data: url } = await supabase.rpc('record_link_click', { p_link: id });
  return NextResponse.redirect(typeof url === 'string' ? url : home);
}
