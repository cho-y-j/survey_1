import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#ff7c43', '#0F79CB', '#8BC34A', '#E91E63',
  '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4'
];

/**
 * 도넛 차트 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {Array} props.data - 안쪽 도넛에 표시할 데이터
 * @param {Array} props.outerData - 바깥쪽 도넛에 표시할 데이터 (옵션)
 * @param {string} props.dataKey - 데이터값 키 (기본값: 'value')
 * @param {string} props.nameKey - 이름 키 (기본값: 'name')
 * @param {number} props.height - 차트 높이 (기본값: 400)
 * @param {Object} props.tooltip - 툴팁 포맷터 설정
 * @param {number} props.innerRadius - 안쪽 도넛 내부 반지름 비율 (기본값: 45)
 * @param {number} props.outerRadius - 안쪽 도넛 외부 반지름 비율 (기본값: 60)
 * @param {number} props.outerInnerRadius - 바깥 도넛 내부 반지름 비율 (기본값: 70)
 * @param {number} props.outerOuterRadius - 바깥 도넛 외부 반지름 비율 (기본값: 80)
 * @returns {React.Component} 도넛 차트 컴포넌트
 */
const DonutChart = ({
  data = [],
  outerData = null,
  dataKey = 'value',
  nameKey = 'name',
  height = 400,
  tooltip = {}, 
  innerRadius = 45,
  outerRadius = 60,
  outerInnerRadius = 70,
  outerOuterRadius = 80
}) => {
  // 툴팁 포맷터 정의
  const defaultFormatter = (value) => [value, 'Value'];
  const formatter = tooltip.formatter || defaultFormatter;
  
  // 커스텀 툴팁 정의
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const [formattedValue, name] = formatter(payload[0].value, payload[0].name);
      return (
        <div 
          style={{ 
            backgroundColor: '#fff', 
            padding: '10px', 
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          <p style={{ margin: 0 }}>{`${payload[0].name} : ${formattedValue}`}</p>
          {name && <p style={{ margin: 0 }}>{name}</p>}
        </div>
      );
    }
    return null;
  };
  
  // 범례 렌더러 정의
  const renderCustomizedLegend = (props) => {
    const { payload } = props;
    
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: '8px',
        marginTop: '10px'
      }}>
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} style={{ 
            display: 'flex', 
            alignItems: 'center',
            margin: '0 8px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: entry.color,
              marginRight: '5px'
            }} />
            <span style={{ fontSize: '12px' }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        {/* 안쪽 도넛 */}
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={`${innerRadius}%`}
          outerRadius={`${outerRadius}%`}
          fill="#8884d8"
          paddingAngle={1}
          dataKey={dataKey}
          nameKey={nameKey}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        
        {/* 외부 도넛 (있는 경우에만) */}
        {outerData && outerData.length > 0 && (
          <Pie
            data={outerData}
            cx="50%"
            cy="50%"
            innerRadius={`${outerInnerRadius}%`}
            outerRadius={`${outerOuterRadius}%`}
            fill="#8884d8"
            paddingAngle={1}
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {outerData.map((entry, index) => (
              <Cell key={`outer-cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
            ))}
          </Pie>
        )}
        
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderCustomizedLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DonutChart; 