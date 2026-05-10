import { NextRequest, NextResponse } from "next/server";
import { removeTrack } from "@/lib/motion-audio-store";

/**
 * DELETE /api/motion/audio/<id>
 * Removes a track from the library + deletes the file from disk.
 */

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const ok = removeTrack(id);
  return NextResponse.json({ ok });
}
