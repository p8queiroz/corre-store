/**
 * Image processing pipeline (educational stub).
 *
 * Production steps:
 * 1. Validate magic bytes (not just MIME from client)
 * 2. Strip EXIF / resize with sharp
 * 3. Generate WebP thumbnails
 * 4. Upload to S3 and update ListingImage URLs
 */
export async function processImageJob(
  payload: Record<string, unknown>
): Promise<void> {
  const filename = payload.filename as string | undefined;
  console.log(`[worker:image] process ${filename ?? "unknown"}`);
  // TODO: integrate sharp + S3 — see docs/09-media-uploads.md
}
