import React from 'react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

// 차트 색상
const CHART_COLORS = [
  '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', 
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#f44336', '#e91e63', '#9c27b0'
];

/**
 * 재사용 가능한 막대 차트 컴포넌트
 * @param {Array} data - 차트 데이터 배열
 * @param {string} dataKey - 데이터 값을 나타내는 키
 * @param {string} nameKey - 데이터 이름을 나타내는 키
 * @param {boolean} vertical - 세로 막대 차트 여부 (기본값: false)
 * @param {number} height - 차트 높이 (기본값: 300)
 * @param {string} fill - 막대 색상 (기본값: '#8884d8')
 * @param {boolean} useColorArray - 여러 색상 사용 여부
 * @param {Object} tooltip - 툴팁 커스터마이징 옵션
 * @param {Function} tooltip.formatter - 툴팁 값 포맷 함수
 */
const BarChart = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  vertical = false,
  height = 300,
  fill = '#8884d8',
  useColorArray = false,
  tooltip = { formatter: null },
  yAxisDomain,
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        데이터가 없습니다.
      </div>
    );
  }

  const layout = vertical ? 'vertical' : 'horizontal';
  const margin = vertical 
    ? { top: 5, right: 30, left: 100, bottom: 5 } 
    : { top: 5, right: 30, left: 20, bottom: 30 };

  // X축과 Y축 설정
  const xAxisProps = vertical ? {
    type: 'number',
  } : {
    type: 'category',
    dataKey: nameKey,
    angle: data.length > 5 ? -45 : 0,
    textAnchor: data.length > 5 ? 'end' : 'middle',
    height: data.length > 5 ? 80 : 50,
  };

  const yAxisProps = vertical ? {
    type: 'category',
    dataKey: nameKey,
    width: 100,
  } : {
    domain: yAxisDomain || [0, 'auto'],
  };

  // 툴팁 설정
  const tooltipProps = tooltip.formatter ? {
    formatter: tooltip.formatter,
  } : {};

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey={dataKey} fill={fill}>
            {useColorArray && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;