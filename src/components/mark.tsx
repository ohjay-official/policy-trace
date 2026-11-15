const CELLS = ["#24b47e", "#8d8d8d", "#006239", "#8d8d8d", "#1c1c1c", "#24b47e", "#8d8d8d", "#3ecf8e", "#006239"];

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="5" fill="#f8f8f8" />
      {CELLS.map((fill, i) => {
        const c = i % 3;
        const r = Math.floor(i / 3);
        return <rect key={i} x={6 + c * 7.25} y={6 + r * 7.25} width="5.5" height="5.5" rx="1" fill={fill} />;
      })}
    </svg>
  );
}
