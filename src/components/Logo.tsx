export function Logo({ size = "lg", showTagline = true }) {
  const logoSize = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const textSize = size === "lg" ? "text-3xl" : "text-2xl";
  const iconSize = size === "lg" ? "24" : "20";

  return (
    <div className="flex items-center gap-3">
      <div className={`flex ${logoSize} items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30`}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="text-left">
        <div className={`font-display ${textSize} font-extrabold leading-none text-slate-900`}>
          Maza<span className="text-brand">CV</span>
        </div>
        {showTagline && (
          <div className="mt-1 text-sm font-semibold text-amber-brand">
            CV banao mazedaar.
          </div>
        )}
      </div>
    </div>
  );
}
