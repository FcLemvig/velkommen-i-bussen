import { RideStatus } from "@/lib/domain";
import { rideStatusLabels, rideStatusTone } from "@/lib/labels";
import { isRideStatus } from "@/lib/domain";

export function StatusBadge({ status }: { status: RideStatus | string }) {
  const safeStatus = isRideStatus(status) ? status : "PENDING";

  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${rideStatusTone[safeStatus]}`}>
      {rideStatusLabels[safeStatus]}
    </span>
  );
}
