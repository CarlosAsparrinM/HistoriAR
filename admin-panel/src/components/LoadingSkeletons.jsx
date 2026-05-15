/**
 * Componente LoadingSkeletons - Placeholder mejorado mientras se cargan los datos
 */
export function KPISkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-8 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-muted rounded" />
      <div className="h-40 bg-muted rounded" />
      <div className="h-4 bg-muted rounded w-3/4" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="h-6 bg-muted rounded flex-1" />
            <div className="h-6 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-8 w-8 bg-muted rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card">
            <KPISkeleton />
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="p-6 rounded-lg border bg-card">
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded w-24" />
            ))}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card">
            <ChartSkeleton />
          </div>
        ))}
      </div>

      {/* Tablas */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-6 rounded-lg border bg-card">
            <ListSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  KPISkeleton,
  CardSkeleton,
  ChartSkeleton,
  ListSkeleton,
  DashboardLoadingSkeleton,
};
