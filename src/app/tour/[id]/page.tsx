import { getTour } from "@/lib/tour-loader";
import TourClient from "./TourClient";

/**
 * Server entry. Reads the tour JSON via `getTour()` (fs) and hands
 * the data to the client. Splitting like this keeps the client
 * bundle free of `node:fs`.
 */
export default async function TourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tour = getTour(id);

  if (!tour) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted">
          Tour introuvable :{" "}
          <code className="px-1.5 py-0.5 bg-surface-2 rounded">{id}</code>
        </p>
      </div>
    );
  }

  return <TourClient tour={tour} />;
}
