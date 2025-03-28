import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

// 차트 색상
const CHART_COLORS = [
  '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', 
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#f44336', '#e91e63', '#9c27b0'
];

/**
 * 스택형 막대 차트 컴포넌트
 * @param {Array} data - 차트 데이터 배열
 * @param {string} xAxisKey - X축에 표시할 데이터 키
 * @param {Array} stackedItems - 스택에 표시할 항목들의 배열 [{dataKey, name, color}]
 * @param {number} height - 차트 높이 (기본값: 400)
 * @param {boolean} vertical - 세로 방향 차트 여부
 * @param {Object} tooltip - 툴팁 커스터마이징 옵션
 */
const StackedBarChart = ({
  data,
  xAxisKey = 'name',
  stackedItems = [],
  height = 400,
  vertical = false,
  tooltip = { formatter: null },
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        데이터가 없습니다.
      </div>
    );
  }

  // 차트 방향 설정
  const layout = vertical ? 'vertical' : 'horizontal';
  
  // 여백 설정
  const margin = vertical 
    ? { top: 20, right: 30, left: 100, bottom: 5 } 
    : { top: 20, right: 30, left: 20, bottom: 70 };

  // X축 설정
  const xAxisProps = vertical ? {
    type: 'number',
  } : {
    dataKey: xAxisKey,
    type: 'category',
    angle: -45,
    textAnchor: 'end',
    height: 70,
    interval: 0,
  };

  // Y축 설정
  const yAxisProps = vertical ? {
    dataKey: xAxisKey,
    type: 'category',
    width: 100,
  } : {
    type: 'number',
  };

  // 툴팁 설정
  const tooltipProps = tooltip.formatter ? {
    formatter: tooltip.formatter,
  } : {};

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={layout}
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipProps} />
          <Legend />
          
          {stackedItems.map((item, index) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              name={item.name || item.dataKey}
              stackId="a"
              fill={item.color || CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart; 