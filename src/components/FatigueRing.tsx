import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  total: number;
  completed: number;
  activeColor: string;
  dimColor: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

export function FatigueRing({
  total,
  completed,
  activeColor,
  dimColor,
  size = 250,
  strokeWidth = 8,
  children,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth / 2 - 6;
  const gap = total <= 4 ? 12 : total <= 6 ? 9 : 7;
  const slotDeg = 360 / total;
  const arcDeg = slotDeg - gap;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {Array.from({ length: total }, (_, i) => {
          const startDeg = i * slotDeg + gap / 2;
          const endDeg = startDeg + arcDeg;
          const color = i < completed ? activeColor : dimColor;
          return (
            <Path
              key={i}
              d={arcPath(cx, cy, r, startDeg, endDeg)}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      {children}
    </View>
  );
}
