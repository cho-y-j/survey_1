import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Chip,
  Button
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
// 차트 컴포넌트 임포트
import BarChart from '@/components/results/charts/BarChart';
import PieChart from '@/components/results/charts/PieChart';

const CategoryCrossAnalysis = ({
  surveySetId1,
  surveySetId2,
  questions1,
  questions2,
  responses1,
  responses2,
  categories1,
  categories2
}) => {
  const [category1, setCategory1] = useState('');
  const [category2, setCategory2] = useState('');
  const [category1Questions, setCategory1Questions] = useState([]);
  const [category2Questions, setCategory2Questions] = useState([]);
  const [crossAnalysisData, setCrossAnalysisData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 카테고리 변경 시 해당 카테고리의 문항들 필터링
  useEffect(() => {
    if (category1) {
      const filteredQuestions = questions1.filter(q => 
        q.question_category === category1 || q.category === category1
      );
      setCategory1Questions(filteredQuestions);
    } else {
      setCategory1Questions([]);
    }
  }, [category1, questions1]);

  useEffect(() => {
    if (category2) {
      const filteredQuestions = questions2.filter(q => 
        q.question_category === category2 || q.category === category2
      );
      setCategory2Questions(filteredQuestions);
    } else {
      setCategory2Questions([]);
    }
  }, [category2, questions2]);

  // 교차 분석 수행
  useEffect(() => {
    if (category1 && category2 && category1Questions.length > 0 && category2Questions.length > 0) {
      performCrossAnalysis();
    } else {
      setCrossAnalysisData(null);
    }
  }, [category1, category2, category1Questions, category2Questions, responses1, responses2]);

  // 문항 유형을 사람이 읽기 쉬운 형태로 변환
  const getQuestionTypeLabel = (type) => {
    const typeMap = {
      'text': '텍스트',
      'paragraph': '문단',
      'single_choice': '단일 선택',
      'multiple_choice': '객관식',
      'checkbox': '체크박스',
      'scale': '척도형',
      'scale_5': '5점 척도',
      'scale_7': '7점 척도',
      'rating': '평점',
      'likert': '리커트',
      'number': '숫자',
      'date': '날짜',
      'time': '시간',
      'file': '파일'
    };
    
    return typeMap[type] || type;
  };

  // 교차 분석 수행 함수
  const performCrossAnalysis = () => {
    try {
      setErrorMessage('');
      console.log('교차 분석 수행 시작:', { category1, category2 });
      
      // 분석에 적합한 문항 타입 확인
      const cat1Question = category1Questions[0]; // 첫 번째 문항 사용
      const cat2Question = category2Questions[0]; // 첫 번째 문항 사용

      if (!cat1Question || !cat2Question) {
        setErrorMessage('선택된 카테고리에 분석 가능한 문항이 없습니다.');
        setCrossAnalysisData(null);
        return;
      }

      console.log('선택된 문항:', {
        cat1: cat1Question.question_text || cat1Question.text,
        cat2: cat2Question.question_text || cat2Question.text
      });

      // 응답 필터링
      const cat1Responses = responses1.filter(r => r.question_id === cat1Question.id);
      const cat2Responses = responses2.filter(r => r.question_id === cat2Question.id);

      console.log('필터링된 응답:', {
        cat1Count: cat1Responses.length,
        cat2Count: cat2Responses.length
      });

      // 응답자 ID별로 데이터 그룹화
      const userResponses = {};
      
      cat1Responses.forEach(response => {
        if (!userResponses[response.user_id]) {
          userResponses[response.user_id] = {};
        }
        userResponses[response.user_id].category1 = response.answer;
      });
      
      cat2Responses.forEach(response => {
        if (!userResponses[response.user_id]) {
          userResponses[response.user_id] = {};
        }
        userResponses[response.user_id].category2 = response.answer;
      });

      // 교차 데이터 계산
      const crossData = {};
      let cat1Values = new Set();
      let cat2Values = new Set();
      
      Object.values(userResponses).forEach(data => {
        if (data.category1 && data.category2) {
          const key1 = String(data.category1).trim();
          const key2 = String(data.category2).trim();
          
          cat1Values.add(key1);
          cat2Values.add(key2);
          
          if (!crossData[key1]) {
            crossData[key1] = {};
          }
          
          if (!crossData[key1][key2]) {
            crossData[key1][key2] = 0;
          }
          
          crossData[key1][key2]++;
        }
      });

      console.log('교차 데이터 계산 완료:', { 
        cat1Values: Array.from(cat1Values).length,
        cat2Values: Array.from(cat2Values).length
      });

      // 차트 데이터 형식으로 변환
      cat1Values = Array.from(cat1Values);
      cat2Values = Array.from(cat2Values);
      
      const chartData = cat1Values.map(val1 => {
        const dataPoint = {
          name: val1,
          total: 0
        };
        
        cat2Values.forEach(val2 => {
          dataPoint[val2] = crossData[val1]?.[val2] || 0;
          dataPoint.total += dataPoint[val2];
        });
        
        return dataPoint;
      });

      // 각 카테고리별 응답 분포 계산
      const category1Distribution = cat1Values.map(val => ({
        name: val,
        value: cat1Responses.filter(r => String(r.answer).trim() === val).length
      }));
      
      const category2Distribution = cat2Values.map(val => ({
        name: val,
        value: cat2Responses.filter(r => String(r.answer).trim() === val).length
      }));

      // 스택형 차트 항목 구성
      const stackedItems = cat2Values.map(val => ({
        dataKey: val,
        name: val
      }));

      // 결과 저장
      setCrossAnalysisData({
        chartData,
        stackedItems,
        category1: {
          name: category1,
          question: cat1Question,
          values: cat1Values,
          distribution: category1Distribution
        },
        category2: {
          name: category2,
          question: cat2Question,
          values: cat2Values,
          distribution: category2Distribution
        }
      });
      
      console.log('교차 분석 완료:', chartData);
    } catch (error) {
      console.error('교차 분석 오류:', error);
      setErrorMessage('교차 분석 중 오류가 발생했습니다: ' + error.message);
      setCrossAnalysisData(null);
    }
  };

  // 카테고리 선택 핸들러
  const handleCategory1Change = (event) => {
    setCategory1(event.target.value);
  };

  const handleCategory2Change = (event) => {
    setCategory2(event.target.value);
  };

  // 교차 분석 차트 렌더링
  const renderCrossAnalysisChart = () => {
    if (!crossAnalysisData) return null;

    const { chartData, stackedItems, category1, category2 } = crossAnalysisData;

    return (
      <Grid container spacing={3}>
        {/* 교차 분석 막대 차트 */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: '10px' }}>
            <Typography variant="h6" gutterBottom sx={{ 
              borderLeft: '4px solid #1976d2', 
              pl: 2, 
              py: 1,
              backgroundColor: 'rgba(25, 118, 210, 0.1)'
            }}>
              {category1.name} × {category2.name} 교차 분석
            </Typography>
            
            <Box sx={{ height: 400, mt: 3 }}>
              <BarChart
                data={chartData}
                dataKey={stackedItems[0]?.dataKey || 'value'}
                nameKey="name"
                height={400}
                useColorArray={true}
                tooltip={{ 
                  formatter: (value) => [`${value}명`, '응답자 수']
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* 개별 카테고리 분포 차트 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: '10px' }}>
            <Typography variant="h6" gutterBottom>
              {category1.name} 분포
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {category1.question.question_text || category1.question.text}
            </Typography>
            
            <Box sx={{ height: 300, mt: 2 }}>
              <PieChart
                data={category1.distribution}
                dataKey="value"
                nameKey="name"
                height={300}
                tooltip={{
                  formatter: (value) => [`${value}명`, '응답']
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: '10px' }}>
            <Typography variant="h6" gutterBottom>
              {category2.name} 분포
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {category2.question.question_text || category2.question.text}
            </Typography>
            
            <Box sx={{ height: 300, mt: 2 }}>
              <PieChart
                data={category2.distribution}
                dataKey="value"
                nameKey="name"
                height={300}
                tooltip={{
                  formatter: (value) => [`${value}명`, '응답']
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* 상세 데이터 테이블 */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: '10px' }}>
            <Typography variant="h6" gutterBottom>
              교차 분석 상세 데이터
            </Typography>
            
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>{category1.name}</th>
                    {category2.values.map(val => (
                      <th key={val} style={tableHeaderStyle}>{val}</th>
                    ))}
                    <th style={tableHeaderStyle}>총계</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, index) => (
                    <tr key={row.name} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={tableCellStyle}><strong>{row.name}</strong></td>
                      {category2.values.map(val => (
                        <td key={val} style={tableCellStyle}>{row[val] || 0}</td>
                      ))}
                      <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // 테이블 스타일
  const tableHeaderStyle = {
    backgroundColor: '#f1f8ff',
    border: '1px solid #ddd',
    padding: '12px 15px',
    textAlign: 'center'
  };

  const tableCellStyle = {
    border: '1px solid #ddd',
    padding: '10px 15px',
    textAlign: 'center'
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CompareArrowsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              설문 세트 카테고리 비교 분석
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            서로 다른 설문 세트의 카테고리를 선택하여 비교 분석을 수행할 수 있습니다. 이를 통해 설문 세트 간의 응답 패턴을 비교할 수 있습니다.
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth>
                <InputLabel id="category1-select-label">첫 번째 설문 세트 카테고리</InputLabel>
                <Select
                  labelId="category1-select-label"
                  value={category1}
                  label="첫 번째 설문 세트 카테고리"
                  onChange={handleCategory1Change}
                >
                  <MenuItem value="">
                    <em>카테고리 선택</em>
                  </MenuItem>
                  {categories1.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CompareArrowsIcon sx={{ fontSize: 32, color: 'action.active' }} />
            </Grid>
            
            <Grid item xs={12} md={5}>
              <FormControl fullWidth>
                <InputLabel id="category2-select-label">두 번째 설문 세트 카테고리</InputLabel>
                <Select
                  labelId="category2-select-label"
                  value={category2}
                  label="두 번째 설문 세트 카테고리"
                  onChange={handleCategory2Change}
                >
                  <MenuItem value="">
                    <em>카테고리 선택</em>
                  </MenuItem>
                  {categories2.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {category1 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                첫 번째 설문 세트 카테고리: {category1}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {category1Questions.map((q) => (
                  <Chip 
                    key={q.id} 
                    label={`${q.question_text || q.text} (${getQuestionTypeLabel(q.question_type || q.type)})`} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          )}
          
          {category2 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                두 번째 설문 세트 카테고리: {category2}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {category2Questions.map((q) => (
                  <Chip 
                    key={q.id} 
                    label={`${q.question_text || q.text} (${getQuestionTypeLabel(q.question_type || q.type)})`} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          )}
          
          {errorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage}
            </Alert>
          )}
          
          {!category1 || !category2 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              비교 분석을 수행하려면 두 설문 세트의 카테고리를 선택해주세요.
            </Alert>
          ) : !crossAnalysisData && !errorMessage ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                분석 중...
              </Typography>
            </Box>
          ) : null}
        </CardContent>
      </Card>
      
      {crossAnalysisData && renderCrossAnalysisChart()}
    </Box>
  );
};

export default CategoryCrossAnalysis; 