import { NextResponse } from "next/server";

import { getCount, isValidEmail, joinWaitlist } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getCount();
  return NextResponse.json({ count });
}

export async function POST(request: Request) {
  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const result = await joinWaitlist(email);
  return NextResponse.json(
    {
      added: result.added,
      position: result.position,
      count: result.total,
      message: result.added
        ? "You're on the list!"
        : "You're already on the list.",
    },
    { status: result.added ? 201 : 200 },
  );
}
