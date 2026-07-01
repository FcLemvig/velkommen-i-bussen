import { RideStatus } from "@/lib/domain";
import { rideStatusLabels, rideStatusTone } from "@/lib/labels";
import { isRideStatus } from "@/lib/domain";

export function StatusBadge({ status }: { status: RideStatus | string }) {
  const safeStatus = isRideStatus(status) ? status : "PENDING";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${rideStatusTone[safeStatus]}`}>
      {rideStatusLabels[safeStatus]}
    </span>
  );
}
