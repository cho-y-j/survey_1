import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  Line
} from 'recharts';

const COLORS = ['#1976d2', '#ff5722', '#4caf50', '#9c27b0', '#ff9800', '#e91e63'];

/**
 * 향상된 스택형 바차트 컴포넌트 (선 그래프 포함)
 * @param {Object} props - 컴포넌트 props
 * @param {Array} props.data - 차트 데이터
 * @param {string} props.xAxisKey - X축 데이터 키
 * @param {Array} props.stackedItems - 스택 항목 설정 ([{dataKey, name, color}])
 * @param {number} props.height - 차트 높이
 * @param {Object} props.tooltip - 툴팁 설정
 * @param {string} props.lineDataKey - 선 그래프 데이터 키 (옵션)
 * @param {string} props.lineName - 선 그래프 이름 (옵션)
 * @param {string} props.lineColor - 선 그래프 색상 (기본값: '#000000')
 * @param {string} props.yAxisLabel - Y축 라벨 (옵션)
 * @param {string} props.rightYAxisLabel - 오른쪽 Y축 라벨 (옵션)
 * @returns {React.Component} 향상된 스택형 바차트
 */
const AdvancedStackedBarChart = ({
  data = [],
  xAxisKey = 'name',
  stackedItems = [],
  height = 400,
  tooltip = {},
  lineDataKey = null,
  lineName = null,
  lineColor = '#000000',
  yAxisLabel = '',
  rightYAxisLabel = ''
}) => {
  // 툴팁 포맷터 정의
  const defaultFormatter = (value, name) => [value, name];
  const formatter = tooltip.formatter || defaultFormatter;
  
  // 커스텀 툴팁 정의
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div 
          style={{ 
            backgroundColor: '#fff', 
            padding: '10px', 
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => {
            const [formattedValue, name] = formatter(entry.value, entry.name);
            return (
              <p 
                key={`tooltip-${index}`} 
                style={{ 
                  margin: '2px 0',
                  color: entry.color
                }}
              >
                {`${entry.name}: ${formattedValue}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 30,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={xAxisKey} 
          tickLine={false}
          axisLine={true}
          tick={{ fontSize: 12, fill: '#666' }}
        />
        <YAxis 
          tickLine={false}
          axisLine={true}
          tick={{ fontSize: 12, fill: '#666' }}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : null}
        />
        {lineDataKey && (
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tickLine={false}
            axisLine={true}
            tick={{ fontSize: 12, fill: '#666' }}
            label={rightYAxisLabel ? { value: rightYAxisLabel, angle: 90, position: 'insideRight' } : null}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {/* 스택형 바 */}
        {stackedItems.map((item, index) => (
          <Bar 
            key={`bar-${item.dataKey}`}
            dataKey={item.dataKey} 
            name={item.name || item.dataKey}
            stackId="a" 
            fill={item.color || COLORS[index % COLORS.length]}
          >
            {data.map((entry, entryIndex) => (
              <Cell 
                key={`cell-${entryIndex}`} 
                fill={item.color || COLORS[index % COLORS.length]} 
                opacity={0.9}
              />
            ))}
          </Bar>
        ))}
        
        {/* 선 그래프 (있는 경우에만) */}
        {lineDataKey && (
          <Line
            type="monotone"
            dataKey={lineDataKey}
            name={lineName || lineDataKey}
            stroke={lineColor}
            strokeWidth={2}
            yAxisId="right"
            dot={{ stroke: lineColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default AdvancedStackedBarChart; 