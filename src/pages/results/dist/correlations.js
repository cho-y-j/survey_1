import React, { useState, useEffect } from 'react';
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
  Link as MuiLink,
  Container
} from '@mui/material';
import CorrelationAnalysis from '@/components/results/CorrelationAnalysis';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import Link from 'next/link';
import Head from 'next/head';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AnalysisNavBar from '@/components/results/AnalysisNavBar';

const CorrelationsPage = () => {
  const router = useRouter();
  const { distributionId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [surveySetsList, setSurveySetsList] = useState([]);
  const [responses, setResponses] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [demographicSurveySetId, setDemographicSurveySetId] = useState(null);
  const [otherSurveySetId, setOtherSurveySetId] = useState(null);
  const [availableDemographics, setAvailableDemographics] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  
  useEffect(() => {
    if (distributionId) {
      fetchData();
    }
  }, [distributionId]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch distribution information - 테이블명 수정
      const { data: distributionData, error: distributionError } = await supabase
        .from('survey_distributions')  // 여기를 변경
        .select('*, company:companies(*)')
        .eq('id', distributionId)
        .single();
      
      if (distributionError) throw distributionError;
      setDistribution(distributionData);
      
      // 설문셋 ID 추출
      let surveySetIds = [];
      if (distributionData.survey_set_ids) {
        try {
          // 다양한 형태 처리
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
      
      // 설문셋 정보 조회
      const { data: surveySetData, error: surveySetError } = await supabase
        .from('survey_sets')
        .select('*')
        .in('id', surveySetIds);
        
      if (surveySetError) throw surveySetError;
      
      // Fetch all questions for these survey sets
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds);
      
      if (questionsError) throw questionsError;
      
      // Organize survey sets with their questions
      const surveySets = surveySetData.map((set, index) => {
        set.display_order = index;
        set.questions = questions.filter(q => q.survey_set_id === set.id);
        return set;
      });
      
      setSurveySetsList(surveySets);
      
      // 응답 데이터 직접 조회
      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_distribution_id', distributionId);
      
      if (responseError) throw responseError;
      setResponses(responseData);
      
      // 참여자 목록 생성 (user_id 기반)
      const uniqueParticipantIds = [...new Set(responseData.map(resp => resp.user_id))];
      const participantList = uniqueParticipantIds.map(userId => ({
        id: userId
      }));
      
      setParticipants(participantList);
      
      // 인구통계학적 설문셋 찾기
      const demographicSurveySet = surveySets.find(set => 
        set.type?.toLowerCase().includes('demographic')
      );
      
      if (demographicSurveySet) {
        setDemographicSurveySetId(demographicSurveySet.id);
        
        // 인구통계학적 설문셋이 아닌 첫 번째 설문셋을 찾음
        const otherSurveySet = surveySets.find(set => 
          set.id !== demographicSurveySet.id
        );
        
        if (otherSurveySet) {
          setOtherSurveySetId(otherSurveySet.id);
        } else {
          // 다른 설문셋이 없으면 인구통계학적 설문셋을 그대로 사용
          setOtherSurveySetId(demographicSurveySet.id);
        }
      } else if (surveySets.length > 0) {
        // 인구통계학적 설문셋이 없으면 첫 번째 설문셋을 인구통계학적 설문셋으로 사용
        setDemographicSurveySetId(surveySets[0].id);
        
        // 두 번째 설문셋이 있으면 그것을 사용, 없으면 첫 번째 설문셋을 사용
        setOtherSurveySetId(surveySets.length > 1 
          ? surveySets[1].id 
          : surveySets[0].id);
      }
      
      // 인구통계학적 카테고리 추출
      if (demographicSurveySet) {
        const demographicQuestions = questions.filter(q => 
          q.survey_set_id === demographicSurveySet.id
        );
        
        const demographics = [...new Set(demographicQuestions
          .map(q => q.question_category)
          .filter(Boolean))];
        
        setAvailableDemographics(demographics);
      }
      
      // 다른 설문셋의 카테고리 추출
      const allCategories = [...new Set(questions
        .map(q => q.question_category)
        .filter(Boolean))];
      
      setAvailableCategories(allCategories);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <AdminLayout>
        <Container maxWidth="lg">
          <LoadingSpinner />
        </Container>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <Container maxWidth="lg">
          <Alert severity="error">{error}</Alert>
        </Container>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <Head>
        <title>상관관계 분석: {distribution?.title || '설문'}</title>
      </Head>
      
      {/* 분석 페이지 네비게이션 바 (상단에 배치) */}
      <AnalysisNavBar 
        distributionId={distributionId} 
        surveySetId={otherSurveySetId || ''} 
        currentPage="correlations"
        distribution={distribution}
      />
      
      <Container maxWidth="lg">
        {/* 상관관계 분석 컴포넌트 */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AnalyticsIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              상관관계 분석
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <CorrelationAnalysis 
            surveySets={surveySetsList}
            responses={responses}
            participants={participants}
            demographicSurveySetId={demographicSurveySetId}
            otherSurveySetId={otherSurveySetId}
            availableDemographics={availableDemographics}
            availableCategories={availableCategories}
          />
        </Paper>
      </Container>
    </AdminLayout>
  );
};

export default CorrelationsPage;