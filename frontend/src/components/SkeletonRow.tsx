import { TodoRow } from "@/components/TodoRow";
import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonRow() {
  return (
    <TodoRow
      aria-hidden={true}
      left={<Skeleton className="h-4 w-4 rounded-full" />}
      content={
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      }
    />
  );
}
