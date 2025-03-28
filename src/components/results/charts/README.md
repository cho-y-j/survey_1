# 차트 컴포넌트 디렉토리

이 디렉토리는 설문 시스템에서 사용하는 재사용 가능한 차트 컴포넌트를 포함합니다.

## 사용 가능한 컴포넌트

현재 차트 관련 컴포넌트는 각 결과 분석 페이지에서 직접 관리되고 있습니다:

- `src/components/results/CategoryAnalysis.js` - 카테고리별 분석 차트
- `src/components/results/ItemAnalysis.js` - 문항별 분석 차트
- `src/components/results/DemographicAnalysis.js` - 인구통계학적 분석 차트
- `src/components/results/CorrelationAnalysis.js` - 상관관계 분석 차트

향후 공통된 차트 로직이 필요할 경우, 이 디렉토리에 재사용 가능한 차트 컴포넌트를 추가할 수 있습니다:

- `BarChart.js` - 막대 차트 컴포넌트
- `PieChart.js` - 파이 차트 컴포넌트
- `LineChart.js` - 라인 차트 컴포넌트
- `RadarChart.js` - 레이더 차트 컴포넌트
- `ScatterChart.js` - 산점도 차트 컴포넌트
- 기타 필요한 차트 컴포넌트 