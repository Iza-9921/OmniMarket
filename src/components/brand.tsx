export function Brand() {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
      >
        OM
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">
          OmniMarket
        </span>
        <span className="block text-xs text-slate-500">Operations Hub</span>
      </span>
    </span>
  );
}
