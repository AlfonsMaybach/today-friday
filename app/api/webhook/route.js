import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  // Next stage: verify Tochka webhook signature here.
  return NextResponse.json(
    { error: 'Webhook будет активирован после подключения реального эквайринга.' },
    { status: 501 }
  );
}
