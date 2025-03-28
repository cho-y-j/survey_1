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
  Chip
} from '@mui/material';
import CategoryAnalysis from '@/components/results/CategoryAnalysis';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArticleIcon from '@mui/icons-material/Article';
import HomeIcon from '@mui/icons-material/Home';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import Link from 'next/link';
import Head from 'next/head';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import AnalysisNavBar from '@/components/results/AnalysisNavBar';

export default function CategoryCrossAnalysisPage() {
  const router = useRouter();
  const { distributionId, surveySetId: initialSurveySetId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [surveySets, setSurveySets] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [selectedSurveySetId, setSelectedSurveySetId] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (distributionId) {
      fetchDistributionData();
    }
  }, [distributionId]);

  useEffect(() => {
    // URL 파라미터에 설문셋 ID가 있으면 선택
    if (initialSurveySetId && surveySets.length > 0) {
      setSelectedSurveySetId(initialSurveySetId);
    }
  }, [initialSurveySetId, surveySets]);

  useEffect(() => {
    if (selectedSurveySetId) {
      const surveySetQuestions = questions.filter(q => q.survey_set_id == selectedSurveySetId);
      const uniqueCategories = [...new Set(surveySetQuestions
        .map(q => q.question_category)
        .filter(Boolean))];
      
      setCategories(uniqueCategories);
      fetchResponses(selectedSurveySetId);
    }
  }, [selectedSurveySetId, questions]);

  // 배포 정보 불러오기
  const fetchDistributionData = async () => {
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
      
      // 2. 설문셋 ID 추출
      let surveySetIds = [];
      if (distributionData.survey_set_ids) {
        try {
          // 다양한 형태 처리
          if (typeof distributionData.survey_set_ids === 'object') {
            surveySetIds = distributionData.survey_set_ids;
          } 
          else if (typeof distributionData.survey_set_ids === 'string' && 
              (distributionData.survey_set_ids.startsWith('[') || distributionData.survey_set_ids.startsWith('{'))) {
            surveySetIds = JSON.parse(distributionData.survey_set_ids);
          }
          else if (typeof distributionData.survey_set_ids === 'string' && distributionData.survey_set_ids.includes(',')) {
            surveySetIds = distributionData.survey_set_ids.split(',').map(id => id.trim());
          }
          else if (typeof distributionData.survey_set_ids === 'string') {
            surveySetIds = [distributionData.survey_set_ids];
          }
          else if (Array.isArray(distributionData.survey_set_ids)) {
            surveySetIds = distributionData.survey_set_ids;
          }
          else {
            surveySetIds = [String(distributionData.survey_set_ids)];
          }
        } catch (e) {
          console.error("survey_set_ids 파싱 오류:", e);
          surveySetIds = typeof distributionData.survey_set_ids === 'string' 
            ? [distributionData.survey_set_ids] 
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
      
      // 설문셋 목록을 기존 형식과 유사하게 변환
      const surveySetLinks = surveySetData.map((set, index) => ({
        id: index.toString(),
        survey_set_id: set.id,
        display_order: index,
        survey_set: set
      }));
      
      setSurveySets(surveySetLinks);
      
      // 기본 선택 설문셋 설정
      if (!selectedSurveySetId && surveySetLinks.length > 0) {
        setSelectedSurveySetId(surveySetLinks[0].survey_set_id);
      }
      
      // 4. 문항 목록 조회
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds)
        .order('question_id');
      
      if (questionsError) throw questionsError;
      setQuestions(questionsData);
      
      setError(null);
    } catch (error) {
      console.error('데이터 조회 오류:', error.message);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 응답 데이터 가져오기
  const fetchResponses = async (surveySetId) => {
    try {
      setLoading(true);
      // 페이지네이션을 통해 전체 응답 가져오기
      let allResponses = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;

      const surveySetQuestions = questions.filter(q => q.survey_set_id === surveySetId);
      const questionIds = surveySetQuestions.map(q => q.id);

      if (questionIds.length === 0) {
        setResponses([]);
        return;
      }

      while (hasMore) {
        const { data, error } = await supabase
          .from('responses')
          .select('*')
          .eq('survey_distribution_id', distributionId)
          .in('question_id', questionIds)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          allResponses = [...allResponses, ...data];
          page++;
          
          // 더 이상 가져올 데이터가 없는지 확인
          hasMore = data.length === PAGE_SIZE;
          console.log(`응답 데이터 페이지 ${page} 가져옴: ${data.length}개, 총 ${allResponses.length}개`);
        } else {
          hasMore = false;
        }
      }

      console.log(`총 ${allResponses.length}개의 응답 데이터를 가져왔습니다.`);
      setResponses(allResponses);
    } catch (error) {
      console.error('응답 데이터 조회 오류:', error);
      setError(`응답 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
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

  // 로딩 표시
  if (loading) {
    return (
      <AdminLayout title="카테고리별 분석 로딩 중...">
        <LoadingSpinner message="카테고리별 분석 데이터를 불러오는 중입니다..." />
      </AdminLayout>
    );
  }

  // 오류 표시
  if (error) {
    return (
      <AdminLayout title="카테고리별 분석 오류">
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchDistributionData}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`카테고리별 분석: ${distribution?.title || '설문'}`}>
      <Head>
        <title>카테고리별 분석: {distribution?.title || '설문'}</title>
      </Head>
      
      {/* 분석 페이지 네비게이션 바 (상단에 배치) */}
      <AnalysisNavBar 
        distributionId={distributionId} 
        surveySetId={selectedSurveySetId || ''} 
        currentPage="categories"
        distribution={distribution}
      />
      
      {/* 설문셋 선택 */}
      <Paper sx={{ p: 3, mb: 3 }}>
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
      
      {/* 응답자 수 요약 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          응답 요약
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {questions.filter(q => q.survey_set_id == selectedSurveySetId).length}
              </Typography>
              <Typography variant="body2">총 문항 수</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {categories.length}
              </Typography>
              <Typography variant="body2">카테고리 수</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {responses.length}
              </Typography>
              <Typography variant="body2">총 응답 수</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 카테고리별 분석 */}
      {selectedSurveySetId && (
        <CategoryAnalysis
          surveySetId={selectedSurveySetId}
          questions={questions}
          responses={responses}
          categories={categories}
        />
      )}
    </AdminLayout>
  );
} 