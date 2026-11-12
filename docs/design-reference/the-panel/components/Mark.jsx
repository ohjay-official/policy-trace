// The brand mark: a 3x3 rubric grid with one scored cell. Same drawing as app/icon.svg.
export default function Mark({ size = 22 }) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const fill = r === 1 && c === 1 ? '#f2f0ec' : r === 2 && c === 2 ? '#76b900' : '#5a5752';
      cells.push(<rect key={`${r}${c}`} x={6 + c * 7.25} y={6 + r * 7.25} width="5.5" height="5.5" rx="1" fill={fill} />);
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="5" fill="#0d0c0b" />
      {cells}
    </svg>
  );
}
