import { NextRequest, NextResponse } from "next/server";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getTour, saveTour } from "@/lib/tour-loader";
import type { TourEntry } from "@/lib/types/tour";

/**
 * Tour CRUD endpoint backing the visual editor (Sprint 4).
 *
 *   GET  /api/motion/tour/<id> → return the current tour JSON
 *   PUT  /api/motion/tour/<id> → write `tours/<id>.json` from body
 *
 * The id from the path always wins — body.id is normalized to it.
 */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const tour = getTour(id);
  if (!tour) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }
  return NextResponse.json(
    { tour },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let body: { tour?: TourEntry };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.tour) {
    return NextResponse.json(
      { error: "Body must include a `tour` field" },
      { status: 400 },
    );
  }
  try {
    saveTour(id, body.tour);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

/**
 * Removes `tours/<id>.json`. Capture / voiceover / final artifacts
 * sitting under `~/.webgen-motion/tours/<id>/` are left intact on
 * purpose — they're expensive to reproduce and the user can re-add
 * the tour JSON later without losing them. To clean those, point
 * Finder / Terminal at the path manually.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const path = join(process.cwd(), "tours", `${id}.json`);
  if (!existsSync(path)) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }
  try {
    unlinkSync(path);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
