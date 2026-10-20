/** A slow, endless band of phrases. Pure CSS animation, so it costs no JavaScript. Hidden from screen readers. */
export function Marquee({ items }: { items: readonly string[] }) {
  const row = [...items, ...items];
  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-brand-border bg-brand-deep py-5 text-white">
      <div className="ups-marquee flex w-max items-center whitespace-nowrap font-display text-3xl font-medium">
        {row.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-6 pr-6">
            {item}
            <span className="size-2 rounded-full bg-brand-lime" />
          </span>
        ))}
      </div>
    </div>
  );
}
