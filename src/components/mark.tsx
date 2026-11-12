export function Mark({ size = 22 }: { size?: number }) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const fill = r === 1 && c === 1 ? "#1c1c1c" : r === 2 && c === 2 ? "#3ecf8e" : "#8d8d8d";
      cells.push(
        <rect key={`${r}${c}`} x={6 + c * 7.25} y={6 + r * 7.25} width="5.5" height="5.5" rx="1" fill={fill} />,
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="5" fill="#f8f8f8" />
      {cells}
    </svg>
  );
}
