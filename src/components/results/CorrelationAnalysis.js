import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ZAxis,
  Label,
  Heatmap
} from 'recharts';
import AnalyticsIcon from '@mui/icons-material/Analytics';

// 차트 색상
const CHART_COLORS = [
  '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', 
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#f44336', '#e91e63', '#9c27b0'
];

// 상관계수 계산 함수
const calculateCorrelation = (x, y) => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  // 평균 계산
  const xMean = x.reduce((sum, val) => sum + val, 0) / x.length;
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  // 분자 계산: 편차 곱의 합
  let numerator = 0;
  for (let i = 0; i < x.length; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
  }
  
  // 분모 계산: 표준편차의 곱
  let xSumSquares = 0;
  let ySumSquares = 0;
  for (let i = 0; i < x.length; i++) {
    xSumSquares += Math.pow(x[i] - xMean, 2);
    ySumSquares += Math.pow(y[i] - yMean, 2);
  }
  
  const denominator = Math.sqrt(xSumSquares * ySumSquares);
  
  // 0으로 나누기 방지
  if (denominator === 0) return 0;
  
  return numerator / denominator;
};

// 상관계수 강도에 따른 해석
const getCorrelationStrength = (coefficient) => {
  const absCoef = Math.abs(coefficient);
  if (absCoef >= 0.9) return '매우 강한';
  if (absCoef >= 0.7) return '강한';
  if (absCoef >= 0.5) return '중간';
  if (absCoef >= 0.3) return '약한';
  return '매우 약한';
};

// 상관계수 부호에 따른 관계
const getCorrelationType = (coefficient) => {
  if (coefficient > 0) return '양의';
  if (coefficient < 0) return '음의';
  return '무';
};

const CorrelationAnalysis = ({
  distribution,
  surveySetsList,
  responses,
  participants,
  isLoading
}) => {
  // State variables
  const [demographicSurveySet, setDemographicSurveySet] = useState('');
  const [demographicQuestion, setDemographicQuestion] = useState('');
  const [responseSurveySet, setResponseSurveySet] = useState('');
  const [responseQuestion, setResponseQuestion] = useState('');
  const [correlationData, setCorrelationData] = useState([]);
  const [correlationCoefficient, setCorrelationCoefficient] = useState(null);
  const [error, setError] = useState('');

  // Options for dropdowns
  const demographicSurveySets = useMemo(() => {
    return surveySetsList.filter(set => 
      set.type === 'demographic' || 
      set.questions.some(q => q.demographic_flag)
    );
  }, [surveySetsList]);

  const responseSurveySets = useMemo(() => {
    return surveySetsList.filter(set => 
      set.type !== 'demographic' ||
      set.questions.some(q => !q.demographic_flag)
    );
  }, [surveySetsList]);

  // Get questions based on selected survey sets
  const demographicQuestions = useMemo(() => {
    if (!demographicSurveySet) return [];
    const selectedSet = surveySetsList.find(set => set.id === demographicSurveySet);
    if (!selectedSet) return [];
    
    return selectedSet.questions.filter(q => 
      q.demographic_flag || 
      selectedSet.type === 'demographic'
    );
  }, [demographicSurveySet, surveySetsList]);

  const responseQuestions = useMemo(() => {
    if (!responseSurveySet) return [];
    const selectedSet = surveySetsList.find(set => set.id === responseSurveySet);
    if (!selectedSet) return [];
    
    return selectedSet.questions.filter(q => 
      !q.demographic_flag || 
      (selectedSet.type !== 'demographic' && 
      (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'scale'))
    );
  }, [responseSurveySet, surveySetsList]);

  // Calculate correlation data when selections change
  useEffect(() => {
    if (demographicQuestion && responseQuestion && responses.length > 0) {
      calculateCorrelationData();
    }
  }, [demographicQuestion, responseQuestion, responses]);

  const calculateCorrelationData = () => {
    if (!responses.length) {
      setError('응답 데이터가 없습니다.');
      return;
    }

    try {
      // Get selected questions
      const demoQ = surveySetsList
        .flatMap(set => set.questions)
        .find(q => q.id === demographicQuestion);
      
      const respQ = surveySetsList
        .flatMap(set => set.questions)
        .find(q => q.id === responseQuestion);

      if (!demoQ || !respQ) {
        setError('선택한 문항을 찾을 수 없습니다.');
        return;
      }

      // Group responses by participant
      const participantResponses = {};
      
      responses.forEach(response => {
        if (!participantResponses[response.participant_id]) {
          participantResponses[response.participant_id] = {};
        }
        participantResponses[response.participant_id][response.question_id] = response.answer;
      });

      // Create correlation data points
      const dataPoints = [];
      let validPairs = 0;

      Object.values(participantResponses).forEach(pResponses => {
        if (pResponses[demoQ.id] && pResponses[respQ.id]) {
          // Extract values (convert to numeric if possible)
          let x = pResponses[demoQ.id];
          let y = pResponses[respQ.id];
          
          // Try to convert to numeric for calculation
          const xNum = getNumericValue(x, demoQ);
          const yNum = getNumericValue(y, respQ);
          
          if (xNum !== null && yNum !== null) {
            dataPoints.push({
              x: xNum,
              y: yNum,
              xLabel: getLabelForValue(x, demoQ),
              yLabel: getLabelForValue(y, respQ),
              count: 1
            });
            validPairs++;
          }
        }
      });

      // Calculate correlation coefficient for numeric data
      if (validPairs > 1) {
        const coefficient = calculatePearsonCorrelation(dataPoints);
        setCorrelationCoefficient(coefficient);
      } else {
        setCorrelationCoefficient(null);
      }

      // For categorical data, aggregate by groups to create a heatmap-like view
      if (demoQ.type === 'single_choice' || respQ.type === 'single_choice') {
        const aggregatedData = aggregateDataPoints(dataPoints, demoQ, respQ);
        setCorrelationData(aggregatedData);
      } else {
        setCorrelationData(dataPoints);
      }

      setError('');
    } catch (err) {
      console.error('Error calculating correlation:', err);
      setError('상관관계 계산 중 오류가 발생했습니다.');
    }
  };

  // Helper functions
  const getNumericValue = (value, question) => {
    if (!value) return null;
    
    // Already numeric
    if (!isNaN(Number(value))) return Number(value);
    
    // Handle scale type directly
    if (question.type === 'scale') return Number(value);
    
    // For single/multiple choice, use option index as numeric value
    if (question.type === 'single_choice' && question.options) {
      const index = question.options.findIndex(opt => opt === value);
      return index >= 0 ? index : null;
    }
    
    return null;
  };

  const getLabelForValue = (value, question) => {
    if (!value) return '';
    
    if (question.type === 'single_choice' && question.options) {
      return value; // Return the option text
    }
    
    return value.toString();
  };

  const aggregateDataPoints = (dataPoints, demoQ, respQ) => {
    const aggregated = {};
    
    dataPoints.forEach(point => {
      const key = `${point.xLabel}-${point.yLabel}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          x: point.xLabel,
          y: point.yLabel,
          xValue: point.x,
          yValue: point.y,
          count: 0
        };
      }
      aggregated[key].count += 1;
    });
    
    return Object.values(aggregated);
  };

  const calculatePearsonCorrelation = (dataPoints) => {
    if (dataPoints.length < 2) return null;
    
    // Extract x and y values
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    
    // Calculate means
    const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
    const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    
    // Calculate required sums
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < dataPoints.length; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    // Calculate correlation coefficient
    const denominator = Math.sqrt(xDenominator * yDenominator);
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Get max count for color scaling
  const maxCount = useMemo(() => {
    if (correlationData.length === 0) return 1;
    return Math.max(...correlationData.map(d => d.count));
  }, [correlationData]);

  // Determine if we should render a heatmap or scatter plot
  const renderHeatmap = useMemo(() => {
    if (!demographicQuestion || !responseQuestion) return false;
    
    const demoQ = surveySetsList
      .flatMap(set => set.questions)
      .find(q => q.id === demographicQuestion);
    
    const respQ = surveySetsList
      .flatMap(set => set.questions)
      .find(q => q.id === responseQuestion);
    
    return demoQ?.type === 'single_choice' || respQ?.type === 'single_choice';
  }, [demographicQuestion, responseQuestion, surveySetsList]);
  
  // Get selected question texts
  const selectedDemoQuestion = useMemo(() => {
    return surveySetsList
      .flatMap(set => set.questions)
      .find(q => q.id === demographicQuestion)?.text || '';
  }, [demographicQuestion, surveySetsList]);
  
  const selectedRespQuestion = useMemo(() => {
    return surveySetsList
      .flatMap(set => set.questions)
      .find(q => q.id === responseQuestion)?.text || '';
  }, [responseQuestion, surveySetsList]);

  // Render functions
  const renderCorrelationSummary = () => {
    if (!demographicQuestion || !responseQuestion) {
      return <Typography variant="body2">문항을 선택해주세요.</Typography>;
    }

    if (correlationData.length === 0) {
      return <Typography variant="body2">상관관계를 계산할 데이터가 부족합니다.</Typography>;
    }

    return (
      <Box mt={2}>
        <Typography variant="h6">상관관계 요약</Typography>
        <Typography variant="body1">
          데이터 포인트 수: {correlationData.length}
        </Typography>
        {correlationCoefficient !== null && (
          <>
            <Typography variant="body1">
              상관계수 (r): {correlationCoefficient.toFixed(4)}
            </Typography>
            <Typography variant="body1">
              상관관계 강도: {getCorrelationStrength(correlationCoefficient)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {correlationCoefficient > 0 
                ? '양의 상관관계: 한 값이 증가하면 다른 값도 증가하는 경향이 있습니다.'
                : '음의 상관관계: 한 값이 증가하면 다른 값은 감소하는 경향이 있습니다.'}
            </Typography>
          </>
        )}
      </Box>
    );
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (correlationData.length === 0 || !demographicQuestion || !responseQuestion) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>문항을 선택하면 상관관계 분석이 표시됩니다.</Typography>
        </Box>
      );
    }

    if (renderHeatmap) {
      // Create a cross-table format for categorical data
      const uniqueXValues = [...new Set(correlationData.map(item => item.x))].sort();
      const uniqueYValues = [...new Set(correlationData.map(item => item.y))].sort();
      
      return (
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 440 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {selectedDemoQuestion} / {selectedRespQuestion}
                </TableCell>
                {uniqueYValues.map(value => (
                  <TableCell key={value} sx={{ fontWeight: 'bold' }}>
                    {value}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {uniqueXValues.map(xValue => (
                <TableRow key={xValue}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{xValue}</TableCell>
                  {uniqueYValues.map(yValue => {
                    const dataPoint = correlationData.find(
                      item => item.x === xValue && item.y === yValue
                    );
                    const count = dataPoint ? dataPoint.count : 0;
                    
                    return (
                      <TableCell 
                        key={`${xValue}-${yValue}`}
                        sx={{ 
                          backgroundColor: count ? getCellColor(count, maxCount) : undefined,
                          textAlign: 'center'
                        }}
                      >
                        {count || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    } else {
      // Render scatter plot for numeric data
      return (
        <Box sx={{ width: '100%', height: 400, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x"
                name={selectedDemoQuestion}
              >
                <Label value={selectedDemoQuestion} offset={-20} position="insideBottom" />
              </XAxis>
              <YAxis 
                type="number" 
                dataKey="y"
                name={selectedRespQuestion}
              >
                <Label 
                  value={selectedRespQuestion} 
                  angle={-90} 
                  position="insideLeft" 
                  style={{ textAnchor: 'middle' }} 
                />
              </YAxis>
              <ZAxis type="number" dataKey="count" range={[60, 400]} />
              <RechartsTooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div style={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #ccc',
                        padding: '10px',
                        borderRadius: '5px'
                      }}>
                        <p>{selectedDemoQuestion}: {data.xLabel || data.x}</p>
                        <p>{selectedRespQuestion}: {data.yLabel || data.y}</p>
                        <p>응답 수: {data.count}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                name="상관관계" 
                data={correlationData} 
                fill="#8884d8"
              >
                {correlationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="#8884d8" 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      );
    }
  };

  return (
    <Box>
      {/* 카테고리 선택 */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            상관관계 분석 설정
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="base-category-label">기준 카테고리 (인구통계)</InputLabel>
                <Select
                  labelId="base-category-label"
                  value={demographicSurveySet}
                  label="기준 카테고리 (인구통계)"
                  onChange={(e) => {
                    setDemographicSurveySet(e.target.value);
                    setDemographicQuestion('');
                  }}
                >
                  {demographicSurveySets.map((set) => (
                    <MenuItem key={set.id} value={set.id}>
                      {set.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="target-category-label">대상 카테고리</InputLabel>
                <Select
                  labelId="target-category-label"
                  value={responseSurveySet}
                  label="대상 카테고리"
                  onChange={(e) => {
                    setResponseSurveySet(e.target.value);
                    setResponseQuestion('');
                  }}
                  disabled={!demographicSurveySet}
                >
                  {responseSurveySets.map((set) => (
                    <MenuItem key={set.id} value={set.id}>
                      {set.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            상관관계 분석은 수치형 질문(척도 등)에 대해서만 계산됩니다. 텍스트 응답이나 단일/다중 선택 문항은 분석에서 제외됩니다.
          </Alert>
        </CardContent>
      </Card>
      
      {/* 분석 결과가 있을 때만 표시 */}
      {demographicSurveySet && responseSurveySet && (
        <>
          {renderCorrelationSummary()}
          {renderChart()}
        </>
      )}
    </Box>
  );
};

export default CorrelationAnalysis; 