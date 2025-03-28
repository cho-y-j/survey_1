import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = {
  primary: '#1976d2',
  secondary: '#ff9800',
};

/**
 * 퍼센트 라인이 있는 스택형 막대 차트 컴포넌트
 * @param {Object} props
 * @param {Array} props.data - 차트 데이터 배열 [{category: '20대', value1: 2, value2: 4, percentage: 10.9}, ...]
 * @param {string} props.xAxisKey - x축 카테고리 키 (기본값: 'category')
 * @param {Object} props.bars - 막대 설정 [{dataKey: 'value1', name: '남자', color: '#1976d2'}, ...]
 * @param {Object} props.percentage - 퍼센트 라인 설정 {dataKey: 'percentage', name: '비율'}
 * @param {number} props.height - 차트 높이 (기본값: 400)
 */
const PercentageBarChart = ({
  data = [],
  xAxisKey = 'category',
  bars = [],
  percentage = { dataKey: 'percentage', name: '비율' },
  height = 400,
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        데이터가 없습니다.
      </div>
    );
  }

  // 막대 차트의 최대값 계산
  const maxBarValue = Math.max(
    ...data.map(item => 
      bars.reduce((sum, bar) => sum + (item[bar.dataKey] || 0), 0)
    )
  );

  // 퍼센트 최대값 계산
  const maxPercentage = Math.max(
    ...data.map(item => item[percentage.dataKey] || 0)
  );

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xAxisKey}
            angle={-45}
            textAnchor="end"
            height={70}
            interval={0}
          />
          {/* 막대 차트용 Y축 */}
          <YAxis
            yAxisId="bar"
            orientation="left"
            domain={[0, maxBarValue * 1.2]}
            tickFormatter={(value) => value}
          />
          {/* 퍼센트 라인용 Y축 */}
          <YAxis
            yAxisId="percentage"
            orientation="right"
            domain={[0, Math.ceil(maxPercentage / 10) * 10]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === percentage.name) {
                return [`${value}%`, name];
              }
              return [value, name];
            }}
          />
          <Legend />

          {/* 막대 차트 렌더링 */}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              yAxisId="bar"
              dataKey={bar.dataKey}
              name={bar.name}
              stackId="stack"
              fill={bar.color || COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length]]}
            />
          ))}

          {/* 퍼센트 라인 */}
          <Line
            yAxisId="percentage"
            type="monotone"
            dataKey={percentage.dataKey}
            name={percentage.name}
            stroke="#000000"
            strokeWidth={2}
            dot={{ fill: '#000000', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PercentageBarChart; 