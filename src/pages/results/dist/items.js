import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import ItemAnalysis from '@/components/results/ItemAnalysis';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArticleIcon from '@mui/icons-material/Article';
import HomeIcon from '@mui/icons-material/Home';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import Link from 'next/link';
import Head from 'next/head';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import { Chip } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AnalysisNavBar from '@/components/results/AnalysisNavBar';

// COLORS 상수 (없다면 추가)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// QuestionCard 컴포넌트 정의
const QuestionCard = ({ question, stats = {} }) => {
  // frequencies 객체를 배열로 변환하는 함수
  const convertFrequenciesToArray = (freqObj) => {
    if (!freqObj || typeof freqObj !== 'object') return [];
    return Object.entries(freqObj).map(([value, count]) => ({ value, count }));
  };
  
  // frequencies 배열로 변환
  const frequenciesArray = convertFrequenciesToArray(stats.frequencies);
  
  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: '10px' }}>
      <Typography variant="h6" gutterBottom>
        {question.text}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Chip label={`유형: ${question.type}`} variant="outlined" />
        <Chip label={`카테고리: ${question.category || '미분류'}`} variant="outlined" />
        <Chip label={`응답 수: ${stats.count || 0}`} variant="outlined" />
      </Box>
      
      {/* 질문 유형에 따른 통계 표시 */}
      {question.type === 'scale' ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            평균 점수: {stats.average ? stats.average.toFixed(2) : '데이터 없음'}
          </Typography>
          {/* 척도형 문항 차트 */}
          <Box sx={{ height: 200, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequenciesArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="value" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="응답 수" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      ) : question.type === 'multiple_choice' || question.type === 'checkbox' ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            선택 분포
          </Typography>
          {/* 객관식/체크박스 문항 차트 */}
          <Box sx={{ height: 200, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={frequenciesArray}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="value"
                  label={({ value, count }) => `${value}: ${count}개`}
                >
                  {frequenciesArray.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            응답 요약
          </Typography>
          <Typography variant="body1">
            총 응답 수: {stats.count || 0}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// 문항 유형 한글화 함수 추가
const formatQuestionType = (type) => {
  if (!type) return '기타';
  
  const typeMap = {
    'text': '텍스트',
    'paragraph': '문단',
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
    'single_choice': '단일 선택',
    'file': '파일'
  };
  
  return typeMap[type.toLowerCase()] || type;
};

export default function ItemsAnalysisPage() {
  const router = useRouter();
  const distributionId = router.query.distributionId || 'dc018a2d-3cdd-47ab-a602-904c3d318139';
  const { surveySetId: initialSurveySetId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [surveySets, setSurveySets] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [selectedSurveySetId, setSelectedSurveySetId] = useState(null);
  const [questionStats, setQuestionStats] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [categoryStats, setCategoryStats] = useState({});
  const [showCategoryAnalysis, setShowCategoryAnalysis] = useState(false);
  const [analysisType, setAnalysisType] = useState('items'); // 'items', 'categories', 'demographics'
  
  // 필터링된 문항과 응답을 상태에 따라 계산
  const filteredQuestions = questions.filter(q => 
    String(q.survey_set_id) === String(selectedSurveySetId)
  );

  const relevantResponses = responses.filter(r => 
    String(r.survey_set_id) === String(selectedSurveySetId)
  );
  
  // 통계 계산 함수 정의
  const calculateQuestionStats = () => {
    const newStats = {};
    let responsesCount = 0;
    
    console.log('문항 통계 계산 시작');
    
    // 생성된 통계 객체의 키 개수 확인
    setInterval(() => {
      console.log(`문항 통계 진행 상황: ${Object.keys(newStats).length}개 처리됨`);
    }, 1000);
    
    // 응답 유형에 따른 처리 함수
    const processAnswer = (answer, type) => {
      if (answer === null || answer === undefined) return null;
      
      try {
        switch (type) {
          case 'scale_5':
          case 'scale_7':
            return isNaN(answer) ? null : parseFloat(answer);
          case 'single_choice':
          case 'multiple_choice':
            return String(answer).trim(); // 문자열 변환 및 공백 제거
          case 'text':
            // 텍스트 응답에 대한 안전한 처리
            return String(answer).replace(/[\r\n]+/g, ' '); // 줄바꿈 제거
          default:
            return String(answer);
        }
      } catch (e) {
        console.error('응답 처리 오류:', e);
        return null; // 오류 발생 시 null 반환
      }
    };
    
    // 관련 응답 데이터 처리
    relevantResponses.forEach(response => {
      const qId = response.question_id;
      
      if (filteredQuestions.find(q => q.id === qId)) {
        const processedAnswer = processAnswer(response.answer, filteredQuestions.find(q => q.id === qId).question_type);
        if (processedAnswer !== null) {
          if (!newStats[qId]) {
            newStats[qId] = {
              answers: [],
              type: filteredQuestions.find(q => q.id === qId).question_type,
              text: filteredQuestions.find(q => q.id === qId).question_text,
              category: filteredQuestions.find(q => q.id === qId).question_category
            };
          }
          newStats[qId].answers.push(processedAnswer);
          responsesCount++;
        }
      }
    });
    
    // 통계 계산
    Object.entries(newStats).forEach(([qId, data]) => {
      const { answers, type, text, category } = data;
      
      if (answers.length > 0) {
        newStats[qId] = {
          count: answers.length,
          question: text,
          questionType: type,
          answers: answers,
          category: category
        };
        
        // 척도형 문항인 경우 평균 계산
        if (type === 'scale_5' || type === 'scale_7') {
          const numericAnswers = answers.filter(a => !isNaN(a));
          if (numericAnswers.length > 0) {
            const sum = numericAnswers.reduce((a, b) => a + b, 0);
            newStats[qId].average = (sum / numericAnswers.length).toFixed(2);
          }
        }
        
        // 선택형 문항인 경우 선택지별 빈도 계산
        if (type === 'single_choice' || type === 'multiple_choice') {
          const frequencies = {};
          answers.forEach(answer => {
            const options = answer.split(';'); // 다중 선택의 경우 세미콜론으로 구분
            options.forEach(option => {
              frequencies[option] = (frequencies[option] || 0) + 1;
            });
          });
          newStats[qId].frequencies = frequencies;
        }
      }
    });
    
    console.log('최종 문항 통계:', newStats);
    return newStats;
  };

  // 카테고리별 통계 계산 함수 추가
  const calculateCategoryStats = (questions, stats) => {
    console.log('카테고리별 통계 계산 시작:', { 
      questions: questions.length, 
      stats: Object.keys(stats).length 
    });
    
    if (!questions || questions.length === 0 || !stats || Object.keys(stats).length === 0) {
      console.error('카테고리 통계 계산 실패: 입력 데이터 부족', { questions, stats });
      return {};
    }

    // 카테고리별로 문항 그룹화
    const questionsByCategory = {};
    questions.forEach(question => {
      const category = question.category || question.question_category || '미분류';
      if (!questionsByCategory[category]) {
        questionsByCategory[category] = [];
      }
      questionsByCategory[category].push(question);
    });

    console.log('카테고리별 문항 그룹화:', Object.keys(questionsByCategory).map(cat => 
      `${cat}: ${questionsByCategory[cat].length}개`
    ));

    // 카테고리별 통계 계산
    const categoryStats = {};
    
    Object.keys(questionsByCategory).forEach(category => {
      const categoryQuestions = questionsByCategory[category];
      const questionIds = categoryQuestions.map(q => q.id);
      
      console.log(`'${category}' 카테고리 문항 ID:`, questionIds);
      
      // 이 카테고리에 속하는 문항들의 통계 정보 필터링
      const categoryQuestionStats = {};
      let categoryTotalResponses = 0;
      
      questionIds.forEach(qId => {
        if (stats[qId]) {
          categoryQuestionStats[qId] = stats[qId];
          categoryTotalResponses += (stats[qId].count || 0);
        } else {
          console.warn(`문항 ID ${qId}에 대한 통계 정보가 없습니다.`);
        }
      });
      
      console.log(`'${category}' 카테고리 응답 수:`, categoryTotalResponses);
      
      // 척도형 질문의 평균 계산
      const scaleQuestions = categoryQuestions.filter(q => 
        (q.type === 'scale' || q.type === 'scale_5' || q.type === 'scale_7' || 
         q.question_type === 'scale' || q.question_type === 'scale_5' || q.question_type === 'scale_7')
      );
      
      console.log(`'${category}' 카테고리 척도형 문항:`, scaleQuestions.length);
      
      const scaleStats = scaleQuestions.map(q => {
        const qId = q.id;
        const questionStat = stats[qId] || {};
        const questionText = q.text || q.question_text || '';
        
        return {
          id: qId,
          text: questionText.substring(0, 30) + (questionText.length > 30 ? '...' : ''), // 텍스트 길이 제한
          average: questionStat.average || 0,
          count: questionStat.count || 0
        };
      });
      
      // 문항 타입 분포
      const typeDistribution = {};
      categoryQuestions.forEach(q => {
        const type = q.type || q.question_type || '기타';
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      });
      
      // 결과 저장
      categoryStats[category] = {
        questionCount: categoryQuestions.length,
        questions: categoryQuestions,
        scaleStats: scaleStats,
        typeDistribution: Object.entries(typeDistribution).map(([type, count]) => ({
          type,
          count
        })),
        // 카테고리의 전체 응답 수
        totalResponses: categoryTotalResponses
      };
    });
    
    console.log('계산된 카테고리별 통계:', Object.keys(categoryStats).map(cat => 
      `${cat}: ${categoryStats[cat].questionCount}개 문항, ${categoryStats[cat].totalResponses}개 응답`
    ));
    
    return categoryStats;
  };

  // 처음 로드 시
  useEffect(() => {
    if (distributionId) {
      fetchAnalysisData();
    }
  }, [distributionId, selectedSurveySetId]);
  
  // URL 파라미터에서 설문셋 ID 처리
  useEffect(() => {
    if (initialSurveySetId && surveySets.length > 0) {
      setSelectedSurveySetId(initialSurveySetId);
    }
  }, [initialSurveySetId, surveySets]);
  
  // 필터링된 데이터가 변경될 때 통계 업데이트
  useEffect(() => {
    if (filteredQuestions.length > 0 && relevantResponses.length > 0) {
      const newStats = calculateQuestionStats();
      setQuestionStats(newStats);
    }
  }, [filteredQuestions.length, relevantResponses.length]);
  
  // useEffect 내부에서 카테고리 통계 계산 추가
  useEffect(() => {
    if (questions.length > 0) {
      console.log("카테고리 통계 계산 트리거됨: 문항 수 =", questions.length);
      
      // 통계 정보가 있는지 확인
      if (Object.keys(questionStats).length > 0) {
        const categoryStatsData = calculateCategoryStats(questions, questionStats);
        setCategoryStats(categoryStatsData);
        console.log('카테고리별 통계 업데이트 완료:', Object.keys(categoryStatsData).length, '개 카테고리');
      } else {
        console.warn("통계 정보가 없어 카테고리 분석을 수행할 수 없습니다.");
      }
    }
  }, [questions, questionStats]);
  
  // API를 통해 최적화된 데이터 가져오기
  const fetchAnalysisData = async () => {
    setLoading(true);
    try {
      // 1. 배포 정보 조회
      const { data: distributionData, error: distributionError } = await supabase
        .from('survey_distributions')
        .select(`
          *,
          company:companies(id, name)
        `)
        .eq('id', distributionId)
        .single();
      
      if (distributionError) throw distributionError;
      setDistribution(distributionData);
      
      // 2. 설문셋 ID를 JSONB 필드에서 추출
      let surveySetIds = [];
      if (distributionData.survey_set_ids) {
        try {
          // JSONB 형식으로 저장된 경우
          if (typeof distributionData.survey_set_ids === 'object') {
            surveySetIds = distributionData.survey_set_ids;
          } else if (typeof distributionData.survey_set_ids === 'string') {
            if (distributionData.survey_set_ids.startsWith('[') || distributionData.survey_set_ids.startsWith('{')) {
              surveySetIds = JSON.parse(distributionData.survey_set_ids);
            } else if (distributionData.survey_set_ids.includes(',')) {
              surveySetIds = distributionData.survey_set_ids.split(',').map(id => id.trim());
            } else {
              surveySetIds = [distributionData.survey_set_ids];
            }
          }
        } catch (e) {
          console.error("survey_set_ids 파싱 오류:", e);
          surveySetIds = typeof distributionData.survey_set_ids === 'string' 
            ? [distributionData.survey_set_ids] 
            : Array.isArray(distributionData.survey_set_ids) 
              ? distributionData.survey_set_ids 
              : [String(distributionData.survey_set_ids)];
        }
      }
      
      console.log('파싱된 설문셋 IDs:', surveySetIds);
      
      // 3. 설문셋 정보 조회
      const { data: surveySetData, error: surveySetError } = await supabase
        .from('survey_sets')
        .select('id, name, type')
        .in('id', surveySetIds);
        
      if (surveySetError) throw surveySetError;
      
      const surveySetLinks = surveySetData.map((set, index) => ({
        id: index.toString(),
        survey_set_id: set.id,
        display_order: index,
        survey_set: set
      }));
      
      setSurveySets(surveySetLinks);
      
      if (!selectedSurveySetId && surveySetLinks.length > 0) {
        const initialSurveySet = initialSurveySetId || surveySetLinks[0].survey_set_id;
        setSelectedSurveySetId(initialSurveySet);
      }
      
      // 4. 최적화된 API를 통해 문항별 데이터 가져오기
      if (selectedSurveySetId) {
        try {
          setLoading(true);
          
          // 모든 응답 가져오기를 위한 파라미터 추가
          const response = await fetch(`/api/results/${distributionId}/items?surveySetId=${selectedSurveySetId}&includeAllResponses=true`);
          
          if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
          }
          
          const analysisData = await response.json();
          console.log('API 응답 데이터:', analysisData);
          
          // 문항 수와 응답 수 로그 추가
          const items = analysisData.data.items || [];
          console.log('문항 수:', items.length);
          
          // 총 응답 수 계산
          let totalResponses = 0;
          items.forEach(item => {
            totalResponses += parseInt(item.response_count) || 0;
          });
          console.log('총 응답 수:', totalResponses, '(예상 응답 수:', items.length * 50, ')');
          
          // 데이터 구조화 - 문항 정보 설정
          const formattedQuestions = items.map(item => ({
              id: item.question_id,
            text: item.question_text || '',
            type: item.question_type || '',
            category: item.question_category || '',
            survey_set_id: selectedSurveySetId,
              question_text: item.question_text || '',
              question_type: item.question_type || '',
            question_category: item.question_category || ''
          }));
          
          setQuestions(formattedQuestions);
          
          // 통계 정보 처리
          const statsMap = {};
          items.forEach(item => {
            // frequencies 객체를 배열로 변환
            const frequenciesObj = item.frequencies || {};
            const frequenciesArray = Object.entries(frequenciesObj).map(([value, count]) => ({
              value, count
            }));
            
            statsMap[item.question_id] = {
              count: parseInt(item.response_count) || 0,
                question: item.question_text || '',
                questionType: item.question_type || '',
              category: item.question_category || '',
              average: item.avg_value !== undefined ? parseFloat(item.avg_value) : 0,
              frequencies: frequenciesObj,
              frequenciesArray: frequenciesArray
              };
            });
            
          setQuestionStats(statsMap);
          
          // 디버깅 정보
          console.log('통계 정보:', statsMap);
          console.log('문항 총 개수:', formattedQuestions.length);
          console.log('응답 있는 문항 개수:', Object.values(statsMap).filter(s => s.count > 0).length);
          
          // 카테고리 계산
          const categoryStatsData = calculateCategoryStats(formattedQuestions, statsMap);
          setCategoryStats(categoryStatsData);
            
            // 에러 상태 초기화
            setError(null);
        } catch (err) {
          console.error('데이터 조회 오류:', err);
          
          // 상세 오류 정보 추가
          let errorMessage = `데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`;
          
          // 응답 오류인 경우 추가 정보 표시
          if (err.response) {
            errorMessage += ` (상태 코드: ${err.response.status})`;
            try {
              const errorData = await err.response.json();
              errorMessage += ` - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
              // JSON 파싱 실패시 무시
            }
          }
          
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      }
      
      setError(null);
    } catch (error) {
      console.error('데이터 조회 오류:', error.message);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 설문셋 선택 변경 처리
  const handlesurveySetChange = (event) => {
    const surveySetId = event.target.value;
    setSelectedSurveySetId(surveySetId);
    
    // URL 파라미터 업데이트
    router.push({
      pathname: router.pathname,
      query: { 
        ...router.query, 
        surveySetId 
      }
    }, undefined, { shallow: true });
  };
  
  // 응답자 데이터 분석
  const uniqueRespondents = [...new Set(relevantResponses.map(r => r.user_id))];
  
  // 응답자별 응답 문항 수 계산
  const respondentCounts = {};
  relevantResponses.forEach(r => {
    respondentCounts[r.user_id] = (respondentCounts[r.user_id] || 0) + 1;
  });
  
  // 응답 수가 특정 임계값 미만인 응답자 확인
  const expectedResponseCount = filteredQuestions.length * 0.8;
  const lowResponseRespondents = Object.entries(respondentCounts)
    .filter(([_, count]) => count < expectedResponseCount)
    .map(([userId, count]) => ({ userId, count }));
  
  // 문항별 응답률 확인
  const questionResponseRates = {};
  filteredQuestions.forEach(q => {
    const responsesForQuestion = relevantResponses.filter(r => r.question_id === q.id);
    const responseRate = (responsesForQuestion.length / uniqueRespondents.length) * 100;
    questionResponseRates[q.id] = {
        question: q.question_text,
      responseCount: responsesForQuestion.length,
      responseRate: responseRate.toFixed(2) + '%'
    };
  });

  // 카테고리 필터 적용
  const categoryFilteredQuestions = selectedCategory === '전체' 
    ? filteredQuestions 
    : filteredQuestions.filter(q => q.question_category === selectedCategory);

  // 필터링된 통계 계산
  const filteredStats = {};
  categoryFilteredQuestions.forEach(q => {
    if (questionStats[String(q.id)]) {
      filteredStats[String(q.id)] = questionStats[String(q.id)];
    }
  });

  // 배열을 청크로 나누는 유틸리티 함수
  const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };
  
  // 청크별 처리 함수
  const processChunks = async (chunks, processFn) => {
    for (const chunk of chunks) {
      await processFn(chunk);
    }
  };

  // 카테고리 선택 UI 대신 카테고리 분석 버튼 추가
  const toggleCategoryAnalysis = () => {
    setShowCategoryAnalysis(!showCategoryAnalysis);
  };

  // 렌더링 부분에서 불필요한 테이블 제거하고 UI 개선
  const renderAllCategoryAnalysis = () => {
    if (!categoryStats || Object.keys(categoryStats).length === 0) {
    return (
        <>
          <Alert severity="info">카테고리 통계 정보가 없습니다.</Alert>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">디버깅 정보:</Typography>
            <Typography variant="body2">문항 수: {questions.length}</Typography>
            <Typography variant="body2">통계 정보 키 수: {Object.keys(questionStats).length}</Typography>
            <Typography variant="body2">카테고리 통계 객체: {JSON.stringify(categoryStats)}</Typography>
          </Box>
        </>
      );
    }

    return (
      <Box sx={{ mt: 3 }}>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">통계 요약:</Typography>
          <Typography variant="body2">카테고리 수: {Object.keys(categoryStats).length}</Typography>
          <Typography variant="body2">
            카테고리별 문항 수: {
              Object.entries(categoryStats).map(([cat, stats]) => 
                `${cat}(${stats.questionCount}개)`
              ).join(', ')
            }
          </Typography>
        </Box>
      
        {Object.keys(categoryStats).map((category) => {
          const catStats = categoryStats[category];

  return (
            <Paper key={category} sx={{ p: 3, mb: 4, borderRadius: '10px' }}>
              <Typography variant="h6" gutterBottom sx={{ 
                borderLeft: '4px solid #8884d8', 
                pl: 2,
                py: 1,
                backgroundColor: 'rgba(136, 132, 216, 0.1)'
              }}>
                {category} 카테고리 분석
              </Typography>
              
              <Grid container spacing={3}>
                {/* 카테고리 요약 정보 */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '8px',
                    height: '100%'
                  }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      요약 정보
                    </Typography>
                    
                    <Box sx={{ my: 2 }}>
                      <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <span>• 문항 수:</span> <strong>{catStats.questionCount}개</strong>
            </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <span>• 총 응답 수:</span> <strong>{catStats.totalResponses}개</strong>
                      </Typography>
                      <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <span>• 척도형 문항:</span> <strong>{catStats.scaleStats.length}개</strong>
            </Typography>
          </Box>
          
                    <Divider sx={{ my: 2 }} />
                    
                    {/* 문항 유형 분포 */}
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      문항 유형 분포
                    </Typography>
                    
                    {catStats.typeDistribution.map((type) => (
                      <Box key={type.type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{formatQuestionType(type.type)}:</Typography>
                        <Typography variant="body2" fontWeight="bold">{type.count}개</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                
                {/* 척도형 문항 평균 점수 차트 또는 다른 차트 */}
                <Grid item xs={12} md={8}>
                  {catStats.scaleStats.length > 0 ? (
          <Box>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        척도형 문항 평균 점수
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={catStats.scaleStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="text" 
                              tick={{ fontSize: 10 }} 
                              interval={0} 
                              angle={-45} 
                              textAnchor="end" 
                              height={100} 
                            />
                            <YAxis domain={[0, 5]} />
                            <Tooltip 
                              formatter={(value) => [value.toFixed(2), "평균 점수"]} 
                            />
                            <Bar dataKey="average" fill="#8884d8" name="평균 점수">
                              {catStats.scaleStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        문항 유형 분포
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={catStats.typeDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="type"
                              label={({ type, count }) => `${formatQuestionType(type)}: ${count}개`}
                            >
                              {catStats.typeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}개`, '문항 수']} />
                          </PieChart>
                        </ResponsiveContainer>
          </Box>
        </Box>
                  )}
                </Grid>
              </Grid>
      </Paper>
          );
        })}
      </Box>
    );
  };

  // 분석 타입 변경 핸들러
  const handleAnalysisTypeChange = (type) => {
    setAnalysisType(type);
    // 카테고리 분석 시 자동으로 보이게 설정
    if (type === 'categories') {
      setShowCategoryAnalysis(true);
    }
  };

  // 설문셋 선택 UI 추가
  const renderSurveySetSelector = () => {
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            설문셋 선택
          </Typography>
        </Box>
        
        <FormControl fullWidth>
          <InputLabel id="survey-set-select-label">분석할 설문셋 선택</InputLabel>
          <Select
            labelId="survey-set-select-label"
            value={selectedSurveySetId || ''}
            label="분석할 설문셋 선택"
            onChange={handlesurveySetChange}
          >
            {surveySets.map((surveySetLink) => (
              <MenuItem key={surveySetLink.id} value={surveySetLink.survey_set_id}>
                {surveySetLink.survey_set?.name || '알 수 없는 설문셋'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    );
  };

  // 로딩 표시
  if (loading) {
    return (
      <AdminLayout title="문항별 분석 로딩 중...">
        <LoadingSpinner message="문항별 분석 데이터를 불러오는 중입니다..." />
      </AdminLayout>
    );
  }
  
  // 오류 표시
  if (error) {
    return (
      <AdminLayout title="문항별 분석 오류">
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchAnalysisData}
        />
      </AdminLayout>
    );
  }

          return (
    <AdminLayout title="설문 분석">
      {/* 분석 페이지 네비게이션 바 (상단에 배치) */}
      <AnalysisNavBar 
        distributionId={distributionId} 
        surveySetId={selectedSurveySetId || ''} 
        currentPage="items"
        distribution={distribution}
      />
      
      {/* 설문셋 선택 UI */}
      {renderSurveySetSelector()}

      {/* 분석 타입 네비게이션 - 이 페이지에 필요한 것만 남기기 */}
      <Paper sx={{ p: 2, mb: 4, borderRadius: '10px' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
          <Button
            variant={analysisType === 'items' ? "contained" : "outlined"}
            color="primary"
            onClick={() => handleAnalysisTypeChange('items')}
            startIcon={<AssessmentIcon />}
            sx={{ flex: 1 }}
          >
            문항별 분석
          </Button>
          <Button
            variant={analysisType === 'categories' ? "contained" : "outlined"}
            color="primary"
            onClick={() => handleAnalysisTypeChange('categories')}
            startIcon={<CategoryIcon />}
            sx={{ flex: 1 }}
          >
            카테고리별 분석
          </Button>
        </Box>
      </Paper>
      
      {/* 로딩 상태 표시 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
              </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
      ) : (
        // 콘텐츠 표시
        <>
          {analysisType === 'items' && (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  문항별 분석
                </Typography>
            </Box>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
              </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : filteredQuestions.length === 0 ? (
                <Alert severity="info">문항 데이터가 없습니다.</Alert>
              ) : (
                <Box>
                  {/* 문항 개수와 응답 정보 요약 */}
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">분석 요약:</Typography>
                    <Typography variant="body2">총 문항 수: {filteredQuestions.length}개</Typography>
                  <Typography variant="body2">
                      총 응답 수: {Object.values(questionStats).reduce((sum, stat) => sum + (stat.count || 0), 0)}개
                  </Typography>
              </Box>
                  
                  {/* ItemAnalysis 컴포넌트 사용 */}
                  <ItemAnalysis 
                    questions={filteredQuestions} 
                    questionStats={questionStats} 
                  />
        </Box>
          )}
      </Paper>
          )}
          
          {analysisType === 'categories' && renderAllCategoryAnalysis()}
        </>
      )}

      <Button
        component={Link}
        href={`/results/dist?distributionId=${distributionId}`}
        startIcon={<DashboardIcon />}
        sx={{ mr: 1 }}
      >
        분석 대시보드
      </Button>
    </AdminLayout>
  );
} 