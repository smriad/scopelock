import { NextResponse } from "next/server";
import { loadSample } from "@/lib/samples";

export async function GET() {
  return NextResponse.json({
    sow: loadSample("sow"),
    thread: loadSample("thread"),
  });
}
