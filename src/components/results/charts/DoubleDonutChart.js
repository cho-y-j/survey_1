import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

// 차트 색상
const COLORS = {
  inner: ['#1976d2', '#ff9800'],
  outer: ['#1976d2', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4']
};

/**
 * 이중 도넛 차트 컴포넌트
 * @param {Object} props
 * @param {Array} props.innerData - 내부 도넛 데이터 [{name: '워크샵', value: 50}, ...]
 * @param {Array} props.outerData - 외부 도넛 데이터 [{name: '워크샵', value: 38}, ...]
 * @param {string} props.dataKey - 데이터값 키 (기본값: 'value')
 * @param {string} props.nameKey - 이름 키 (기본값: 'name')
 * @param {number} props.height - 차트 높이 (기본값: 400)
 * @param {Object} props.colors - 커스텀 색상 설정 {inner: [...], outer: [...]}
 */
const DoubleDonutChart = ({
  innerData = [],
  outerData = [],
  dataKey = 'value',
  nameKey = 'name',
  height = 400,
  colors = COLORS,
}) => {
  // 퍼센트 계산 함수
  const calculatePercent = (value, data) => {
    const total = data.reduce((sum, item) => sum + item[dataKey], 0);
    return total > 0 ? (value / total * 100).toFixed(0) : 0;
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = calculatePercent(data.value, 
        data.name.includes('Inner') ? innerData : outerData);
      
      return (
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0 }}>
            {data.name.replace('Inner ', '').replace('Outer ', '')}: {percent}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 커스텀 범례
  const CustomLegend = ({ payload }) => {
    // 중복 제거된 범례 아이템 생성
    const uniqueItems = {};
    payload.forEach(entry => {
      const name = entry.value.replace('Inner ', '').replace('Outer ', '');
      if (!uniqueItems[name]) {
        uniqueItems[name] = entry.color;
      }
    });

    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: '8px',
        marginTop: '10px'
      }}>
        {Object.entries(uniqueItems).map(([name, color], index) => (
          <div key={`legend-${index}`} style={{ 
            display: 'flex', 
            alignItems: 'center',
            margin: '0 8px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              backgroundColor: color,
              marginRight: '5px'
            }} />
            <span style={{ fontSize: '12px' }}>{name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          {/* 내부 도넛 */}
          <Pie
            data={innerData}
            cx="50%"
            cy="50%"
            innerRadius="45%"
            outerRadius="60%"
            paddingAngle={1}
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, value }) => `${calculatePercent(value, innerData)}%`}
            labelLine={false}
          >
            {innerData.map((entry, index) => (
              <Cell 
                key={`inner-cell-${index}`}
                fill={colors.inner[index % colors.inner.length]}
                name={`Inner ${entry[nameKey]}`}
              />
            ))}
          </Pie>

          {/* 외부 도넛 */}
          <Pie
            data={outerData}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="85%"
            paddingAngle={1}
            dataKey={dataKey}
            nameKey={nameKey}
            label={({ name, value }) => `${calculatePercent(value, outerData)}%`}
            labelLine={false}
          >
            {outerData.map((entry, index) => (
              <Cell 
                key={`outer-cell-${index}`}
                fill={colors.outer[index % colors.outer.length]}
                name={`Outer ${entry[nameKey]}`}
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DoubleDonutChart; 