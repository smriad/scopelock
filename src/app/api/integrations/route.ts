import { NextResponse } from "next/server";
import { listIntegrations } from "@/lib/integrations";

export async function GET() {
  const integrations = await listIntegrations();
  return NextResponse.json({ integrations });
}
