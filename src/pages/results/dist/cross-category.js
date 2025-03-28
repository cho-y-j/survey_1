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
  Breadcrumbs,
  Link as MuiLink,
  Alert,
  CircularProgress,
} from '@mui/material';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import Link from 'next/link';
import Head from 'next/head';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import GroupIcon from '@mui/icons-material/Group';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CategoryCrossAnalysis from '@/components/results/CategoryCrossAnalysis';
import AnalysisNavBar from '@/components/results/AnalysisNavBar';

export default function CategoryCrossAnalysisPage() {
  const router = useRouter();
  const { distributionId, surveySetId, compareSetId } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [questions1, setQuestions1] = useState([]);
  const [questions2, setQuestions2] = useState([]);
  const [responses1, setResponses1] = useState([]);
  const [responses2, setResponses2] = useState([]);
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  
  useEffect(() => {
    if (distributionId && surveySetId && compareSetId) {
      fetchData();
    }
  }, [distributionId, surveySetId, compareSetId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 배포 정보 조회
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
      
      // 첫 번째 설문 세트의 문항 정보 조회
      const { data: questions1Data, error: questions1Error } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_set_id', surveySetId);
        
      if (questions1Error) throw questions1Error;
      setQuestions1(questions1Data);
      
      // 두 번째 설문 세트의 문항 정보 조회
      const { data: questions2Data, error: questions2Error } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_set_id', compareSetId);
        
      if (questions2Error) throw questions2Error;
      setQuestions2(questions2Data);
      
      // 카테고리 추출
      const uniqueCategories1 = [...new Set(questions1Data.map(q => q.question_category || q.category || '미분류').filter(Boolean))];
      const uniqueCategories2 = [...new Set(questions2Data.map(q => q.question_category || q.category || '미분류').filter(Boolean))];
      setCategories1(uniqueCategories1);
      setCategories2(uniqueCategories2);
      
      // 첫 번째 설문 세트의 응답 정보 조회
      const { data: responses1Data, error: responses1Error } = await supabase
        .from('responses')
        .select('*')
        .eq('distribution_id', distributionId)
        .eq('survey_set_id', surveySetId);
        
      if (responses1Error) throw responses1Error;
      setResponses1(responses1Data);
      
      // 두 번째 설문 세트의 응답 정보 조회
      const { data: responses2Data, error: responses2Error } = await supabase
        .from('responses')
        .select('*')
        .eq('distribution_id', distributionId)
        .eq('survey_set_id', compareSetId);
        
      if (responses2Error) throw responses2Error;
      setResponses2(responses2Data);
      
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 로딩 표시
  if (loading) {
    return (
      <AdminLayout title="설문 세트 카테고리 비교 분석 로딩 중...">
        <LoadingSpinner message="설문 세트 카테고리 비교 분석 데이터를 불러오는 중입니다..." />
      </AdminLayout>
    );
  }
  
  // 오류 표시
  if (error) {
    return (
      <AdminLayout title="설문 세트 카테고리 비교 분석 오류">
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchData}
        />
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout title="설문 세트 카테고리 비교 분석">
      <Head>
        <title>설문 세트 카테고리 비교 분석 | 설문 시스템</title>
      </Head>
      
      {/* 분석 페이지 네비게이션 바 */}
      <AnalysisNavBar 
        distributionId={distributionId} 
        surveySetId={surveySetId} 
        currentPage="cross"
        distribution={distribution}
      />
      
      {/* 교차 분석 컴포넌트 */}
      <CategoryCrossAnalysis
        surveySetId1={surveySetId}
        surveySetId2={compareSetId}
        questions1={questions1}
        questions2={questions2}
        responses1={responses1}
        responses2={responses2}
        categories1={categories1}
        categories2={categories2}
      />
    </AdminLayout>
  );
} 