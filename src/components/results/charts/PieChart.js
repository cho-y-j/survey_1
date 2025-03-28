import React from 'react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

// 차트 색상
const CHART_COLORS = [
  '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', 
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#f44336', '#e91e63', '#9c27b0'
];

/**
 * 재사용 가능한 파이 차트 컴포넌트
 * @param {Array} data - 차트 데이터 배열
 * @param {string} dataKey - 데이터 값을 나타내는 키
 * @param {string} nameKey - 데이터 이름을 나타내는 키
 * @param {number} height - 차트 높이 (기본값: 300)
 * @param {boolean} showLegend - 범례 표시 여부
 * @param {Object} tooltip - 툴팁 커스터마이징 옵션
 * @param {Function} tooltip.formatter - 툴팁 값 포맷 함수
 */
const PieChart = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 300,
  showLegend = true,
  tooltip = { formatter: null },
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        데이터가 없습니다.
      </div>
    );
  }

  // 툴팁 설정
  const tooltipProps = tooltip.formatter ? {
    formatter: tooltip.formatter,
  } : {};

  // 라벨 렌더링 함수
  const renderCustomizedLabel = ({ name, percent }) => {
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            label={renderCustomizedLabel}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipProps} />
          {showLegend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;