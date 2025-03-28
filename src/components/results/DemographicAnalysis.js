import React from 'react';
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
  Chip,
  Button,
  Stack
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

// 차트 색상
const CHART_COLORS = [
  '#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', 
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#f44336', '#e91e63', '#9c27b0'
];

const DemographicAnalysis = ({
  surveyData,
  questions,
  responses,
  demographicSurveySetId,
  availableDemographics = [],
  onDemographicChange
}) => {
  const [primaryCategory, setPrimaryCategory] = React.useState('');
  const [secondaryCategory, setSecondaryCategory] = React.useState('');
  const [chartType, setChartType] = React.useState('bar');
  const [demographicData, setDemographicData] = React.useState([]);
  const [crossAnalysisData, setCrossAnalysisData] = React.useState([]);

  React.useEffect(() => {
    if (primaryCategory) {
      const data = calculateDemographicData(primaryCategory);
      setDemographicData(data);
    }
  }, [primaryCategory, responses]);

  React.useEffect(() => {
    if (primaryCategory && secondaryCategory) {
      const data = calculateCrossAnalysisData(primaryCategory, secondaryCategory);
      setCrossAnalysisData(data);
    }
  }, [primaryCategory, secondaryCategory, responses]);

  // 단일 카테고리에 대한 인구통계학적 데이터 계산
  const calculateDemographicData = (category) => {
    // 해당 카테고리에 대한 질문 찾기
    const categoryQuestion = questions.find(q => 
      q.question_category === category && 
      q.survey_set_id === demographicSurveySetId
    );

    if (!categoryQuestion) return [];

    // 응답 데이터 계산
    const responseCounts = {};
    const categoryResponses = responses.filter(r => r.question_id === categoryQuestion.id);

    // 선택지 초기화
    if (categoryQuestion.options) {
      categoryQuestion.options.split(',').forEach(option => {
        responseCounts[option.trim()] = 0;
      });
    }

    // 응답 카운트
    categoryResponses.forEach(response => {
      const value = response.response_value;
      if (value) {
        responseCounts[value] = (responseCounts[value] || 0) + 1;
      }
    });

    // 차트 데이터 형식으로 변환
    return Object.entries(responseCounts).map(([name, value]) => ({
      name,
      value
    }));
  };

  // 두 카테고리의 교차 분석 데이터 계산
  const calculateCrossAnalysisData = (primary, secondary) => {
    // 각 카테고리에 대한 질문 찾기
    const primaryQuestion = questions.find(q => 
      q.question_category === primary && 
      q.survey_set_id === demographicSurveySetId
    );
    const secondaryQuestion = questions.find(q => 
      q.question_category === secondary && 
      q.survey_set_id === demographicSurveySetId
    );

    if (!primaryQuestion || !secondaryQuestion) return [];

    // 참여자별 응답 그룹화
    const participantResponses = {};
    
    // 기본 카테고리 응답 수집
    responses.filter(r => r.question_id === primaryQuestion.id).forEach(response => {
      if (!participantResponses[response.participant_id]) {
        participantResponses[response.participant_id] = {};
      }
      participantResponses[response.participant_id].primary = response.response_value;
    });
    
    // 보조 카테고리 응답 수집
    responses.filter(r => r.question_id === secondaryQuestion.id).forEach(response => {
      if (!participantResponses[response.participant_id]) {
        participantResponses[response.participant_id] = {};
      }
      participantResponses[response.participant_id].secondary = response.response_value;
    });

    // 교차 데이터 계산
    const crossData = {};
    const primaryOptions = primaryQuestion.options 
      ? primaryQuestion.options.split(',').map(opt => opt.trim()) 
      : [];
    const secondaryOptions = secondaryQuestion.options 
      ? secondaryQuestion.options.split(',').map(opt => opt.trim()) 
      : [];

    // 결과 구조 초기화
    primaryOptions.forEach(primary => {
      crossData[primary] = {};
      secondaryOptions.forEach(secondary => {
        crossData[primary][secondary] = 0;
      });
    });

    // 교차 응답 카운트
    Object.values(participantResponses).forEach(response => {
      if (response.primary && response.secondary) {
        crossData[response.primary][response.secondary] = 
          (crossData[response.primary][response.secondary] || 0) + 1;
      }
    });

    // 차트 데이터 형식으로 변환
    return primaryOptions.map(primary => {
      const item = { name: primary };
      secondaryOptions.forEach(secondary => {
        item[secondary] = crossData[primary][secondary] || 0;
      });
      return item;
    });
  };

  // 단일 카테고리 차트 렌더링
  const renderSingleCategoryChart = () => {
    if (!demographicData.length) return null;

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={demographicData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="응답자 수" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={demographicData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {demographicData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}명`, '응답자 수']} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={demographicData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name="응답자 수" />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // 교차 분석 차트 렌더링
  const renderCrossAnalysisChart = () => {
    if (!crossAnalysisData.length || !secondaryCategory) return null;

    const secondaryQuestion = questions.find(q => 
      q.question_category === secondaryCategory && 
      q.survey_set_id === demographicSurveySetId
    );
    if (!secondaryQuestion) return null;

    const secondaryOptions = secondaryQuestion.options 
      ? secondaryQuestion.options.split(',').map(opt => opt.trim()) 
      : [];

    return (
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={crossAnalysisData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {secondaryOptions.map((option, index) => (
            <Bar
              key={option}
              dataKey={option}
              barSize={20}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              stackId="a"
            />
          ))}
          <Line
            type="monotone"
            dataKey={secondaryOptions[0]}
            stroke="#ff7300"
            strokeWidth={2}
            name={`${secondaryOptions[0]} 추세`}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box>
      {/* 카테고리 선택 */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            인구통계학적 분석 설정
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="primary-category-label">기본 카테고리</InputLabel>
                <Select
                  labelId="primary-category-label"
                  value={primaryCategory}
                  label="기본 카테고리"
                  onChange={(e) => setPrimaryCategory(e.target.value)}
                >
                  {availableDemographics.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="secondary-category-label">교차 분석 카테고리</InputLabel>
                <Select
                  labelId="secondary-category-label"
                  value={secondaryCategory}
                  label="교차 분석 카테고리"
                  onChange={(e) => setSecondaryCategory(e.target.value)}
                  disabled={!primaryCategory}
                >
                  <MenuItem value="">
                    <em>없음 (단일 분석)</em>
                  </MenuItem>
                  {availableDemographics
                    .filter(category => category !== primaryCategory)
                    .map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="chart-type-label">차트 유형</InputLabel>
                <Select
                  labelId="chart-type-label"
                  value={chartType}
                  label="차트 유형"
                  onChange={(e) => setChartType(e.target.value)}
                  disabled={!primaryCategory}
                >
                  <MenuItem value="bar">막대 차트</MenuItem>
                  <MenuItem value="pie">파이 차트</MenuItem>
                  <MenuItem value="line">라인 차트</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
        </CardContent>
      </Card>
      
      {/* 단일 카테고리 분석 */}
      {primaryCategory && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {primaryCategory} 분석
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mt: 2 }}>
              {renderSingleCategoryChart()}
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                요약 통계
              </Typography>
              <Stack 
                direction="row" 
                spacing={2} 
                sx={{ 
                  flexWrap: 'wrap', 
                  gap: 1,
                  '& > div': { mb: 1 }
                }}
              >
                {demographicData.map((item, index) => (
                  <Chip
                    key={index}
                    label={`${item.name}: ${item.value}명`}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {/* 교차 분석 */}
      {primaryCategory && secondaryCategory && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {primaryCategory} × {secondaryCategory} 교차 분석
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mt: 2 }}>
              {renderCrossAnalysisChart()}
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                교차 분석 요약
              </Typography>
              <Typography variant="body2" color="text.secondary">
                위 차트는 {primaryCategory}에 따른 {secondaryCategory}의 분포를 보여줍니다.
                막대는 각 카테고리의 응답자 수를, 선은 주요 추세를 나타냅니다.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DemographicAnalysis; 