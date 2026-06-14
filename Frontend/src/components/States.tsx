export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="py-16 text-center text-slate-400 animate-pulse">{label}</div>;
}

export function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
      {message}
    </div>
  );
}

export function EmptyState({ message = "Nothing here yet." }: { message?: string }) {
  return <div className="py-16 text-center text-slate-500">{message}</div>;
}
