import { ConversionBadge } from "./ConversionBadge";
import { getHealth, type Health } from "@/lib/benchmarks";
import { cn } from "@/lib/utils";

export interface FunnelData {
  blastCount: number;
  registrationCount: number;
  approvedCount: number;
  attendedCount: number;
  eventStatus:
    | "draft"
    | "published"
    | "active"
    | "completed"
    | "cancelled"
    | "archived";
  eventId: string;
}

interface FunnelBarProps {
  label: string;
  count: number;
  maxCount: number;
  badge: React.ReactNode;
}

function FunnelBar({ label, count, maxCount, badge }: FunnelBarProps) {
  const widthPct = Math.max((count / Math.max(maxCount, 1)) * 100, 2);

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-24 text-sm text-right text-muted-foreground shrink-0">
        {label}
      </span>
      <div className="flex-1 bg-muted rounded-sm min-w-0">
        <div
          role="meter"
          aria-valuenow={count}
          aria-valuemax={maxCount}
          aria-label={`${label}: ${count.toLocaleString("id-ID")}`}
          style={{ width: `${widthPct}%` }}
          className={cn(
            "h-8 rounded-sm transition-all duration-500",
            count === 0 ? "bg-muted-foreground/20" : "bg-primary",
          )}
        />
      </div>
      <span className="w-16 text-sm font-medium text-right tabular-nums shrink-0">
        {count.toLocaleString("id-ID")}
      </span>
      <div className="shrink-0">{badge}</div>
    </div>
  );
}

export function FunnelVisualization({
  blastCount,
  registrationCount,
  approvedCount,
  attendedCount,
  eventStatus,
  eventId,
}: FunnelData) {
  const bc = blastCount ?? 0;
  const rc = registrationCount ?? 0;
  const ac = approvedCount ?? 0;
  const atc = attendedCount ?? 0;
  const maxCount = Math.max(bc, rc, ac, atc, 1);

  // Conversion rates
  const blastToReg = bc > 0 ? rc / bc : null;
  const regToApproval = rc > 0 ? ac / rc : null;
  const approvalToAttend = ac > 0 ? atc / ac : null;

  const isLiveOrDone = eventStatus === "active" || eventStatus === "completed";

  const blastHealth: Health =
    bc === 0
      ? "pending"
      : blastToReg !== null
        ? getHealth(blastToReg, "blastToRegistration")
        : "pending";
  const regHealth: Health =
    rc === 0
      ? "pending"
      : regToApproval !== null
        ? getHealth(regToApproval, "registrationToApproval")
        : "pending";
  const attendHealth: Health = !isLiveOrDone
    ? "pending"
    : approvalToAttend !== null
      ? getHealth(approvalToAttend, "approvalToAttendance")
      : "pending";

  return (
    <div className="space-y-1">
      <FunnelBar
        label="Diundang"
        count={bc}
        maxCount={maxCount}
        badge={
          <ConversionBadge
            health="pending"
            rate={null}
            label="Blast baseline"
          />
        }
      />
      <FunnelBar
        label="Mendaftar"
        count={rc}
        maxCount={maxCount}
        badge={
          <ConversionBadge
            health={blastHealth}
            rate={blastToReg}
            label="Blast → Registrasi"
          />
        }
      />
      <FunnelBar
        label="Disetujui"
        count={ac}
        maxCount={maxCount}
        badge={
          <ConversionBadge
            health={regHealth}
            rate={regToApproval}
            label="Registrasi → Disetujui"
          />
        }
      />
      <FunnelBar
        label="Hadir"
        count={atc}
        maxCount={maxCount}
        badge={
          <ConversionBadge
            health={attendHealth}
            rate={isLiveOrDone ? approvalToAttend : null}
            label="Disetujui → Hadir"
          />
        }
      />
    </div>
  );
}

export function getWorstHealth(...healths: Health[]): Health | null {
  if (healths.includes("bad")) return "bad";
  if (healths.includes("warn")) return "warn";
  return null;
}
