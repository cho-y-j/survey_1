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
  Alert,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import DemographicAnalysis from '@/components/results/DemographicAnalysis';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import Link from 'next/link';
import Head from 'next/head';
import AnalysisNavBar from '@/components/results/AnalysisNavBar';

export default function DemographicsPage() {
  const router = useRouter();
  const { distributionId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [surveySets, setSurveySets] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [availableDemographics, setAvailableDemographics] = useState([]);
  const [demographicSurveySetId, setDemographicSurveySetId] = useState(null);
  
  useEffect(() => {
    if (distributionId) {
      fetchDistributionData();
    }
  }, [distributionId]);
  
  // 배포 정보 불러오기
  const fetchDistributionData = async () => {
    setLoading(true);
    try {
      // 1. 배포 정보 조회 - 테이블명 수정
      const { data: distributionData, error: distributionError } = await supabase
        .from('survey_distributions')  // 여기를 변경
        .select(`
          *,
          company:companies(id, name)
        `)
        .eq('id', distributionId)
        .single();
      
      if (distributionError) throw distributionError;
      setDistribution(distributionData);
      
      // 2. 설문셋 ID를 JSON 필드에서 추출
      let surveySetIds = [];
      if (distributionData.survey_set_ids) {
        try {
          // JSONB 형식인 경우 등 다양한 형태 처리
          if (typeof distributionData.survey_set_ids === 'string' && 
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
      
      // 인구통계학적 설문셋 찾기
      const demographicSurveySet = surveySetData.find(set => 
        set.type?.toLowerCase().includes('demographic')
      );
      
      if (demographicSurveySet) {
        setDemographicSurveySetId(demographicSurveySet.id);
      } else if (surveySetData.length > 0) {
        setDemographicSurveySetId(surveySetData[0].id);
      }
      
      // 4. 문항 목록 조회
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds)
        .order('question_id');
      
      if (questionsError) throw questionsError;
      setQuestions(questionsData);
      
      // 인구통계학적 카테고리 추출
      if (demographicSurveySet) {
        const demographicQuestions = questionsData.filter(q => 
          q.survey_set_id === demographicSurveySet.id
        );
        
        const categories = [...new Set(demographicQuestions
          .map(q => q.question_category)
          .filter(Boolean))];
        
        setAvailableDemographics(categories);
      }
      
      // 5. 응답 데이터 직접 조회
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_distribution_id', distributionId);
        
      if (responsesError) throw responsesError;
      setResponses(responsesData);
      
      setError(null);
    } catch (error) {
      console.error('데이터 조회 오류:', error.message);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 로딩 표시
  if (loading) {
    return (
      <AdminLayout title="인구통계학적 분석 로딩 중...">
        <LoadingSpinner message="인구통계학적 분석 데이터를 불러오는 중입니다..." />
      </AdminLayout>
    );
  }
  
  // 오류 표시
  if (error) {
    return (
      <AdminLayout title="인구통계학적 분석 오류">
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchDistributionData}
        />
      </AdminLayout>
    );
  }
  
  // 인구통계학적 설문셋이 없는 경우
  if (!demographicSurveySetId) {
    return (
      <AdminLayout title="인구통계학적 분석">
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link href="/admin/surveys" passHref>
              <MuiLink underline="hover" color="inherit">
                설문셋 관리
              </MuiLink>
            </Link>
            <Link href={`/results/${distributionId}`} passHref>
              <MuiLink underline="hover" color="inherit">
                결과 분석
              </MuiLink>
            </Link>
            <Typography color="text.primary">인구통계학적 분석</Typography>
          </Breadcrumbs>
        </Box>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {distribution?.title || '설문'} - 인구통계학적 분석
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {distribution?.company?.name}
          </Typography>
        </Paper>
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          인구통계학적 데이터를 포함한 설문셋이 없습니다. 배포 시 인구통계학적 설문셋을 포함시켜주세요.
        </Alert>
        
        <Button
          component={Link}
          href={`/results/${distributionId}`}
          startIcon={<HomeIcon />}
          variant="contained"
        >
          결과 요약으로 돌아가기
        </Button>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout title={`인구통계학적 분석: ${distribution?.title || '설문'}`}>
      <Head>
        <title>인구통계학적 분석: {distribution?.title || '설문'}</title>
      </Head>
      
      {/* 분석 페이지 네비게이션 바 (상단에 배치) */}
      <AnalysisNavBar 
        distributionId={distributionId} 
        surveySetId={demographicSurveySetId || ''} 
        currentPage="demographics"
        distribution={distribution}
      />
      
      {/* 인구통계학적 분석 */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PeopleIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            인구통계학적 분석
          </Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {responses.length === 0 ? (
          <Alert severity="info">
            응답 데이터가 없습니다. 설문에 참여한 응답자가 있는지 확인해주세요.
          </Alert>
        ) : (
          <DemographicAnalysis
            surveyData={surveySets}
            questions={questions}
            responses={responses}
            demographicSurveySetId={demographicSurveySetId}
            availableDemographics={availableDemographics}
          />
        )}
      </Paper>
    </AdminLayout>
  );
} 