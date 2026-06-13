import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: {
      name: "pm-platform-frontend",
      status: "up",
      timestamp: new Date().toISOString(),
    },
    status: "ok",
  });
}
