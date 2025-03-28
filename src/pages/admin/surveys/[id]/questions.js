import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import QuestionTable from '@/components/admin/QuestionTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { Paper, Typography, Box, Alert, Button, Breadcrumbs } from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function QuestionsPage() {
  const router = useRouter();
  const { id: surveySetId } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [surveySet, setSurveySet] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (surveySetId) {
      fetchSurveySetAndQuestions();
    }
  }, [surveySetId]);

  // 설문셋과 문항 가져오기
  const fetchSurveySetAndQuestions = async () => {
    setLoading(true);
    try {
      // 1. 설문셋 정보 가져오기
      const { data: surveySetData, error: surveySetError } = await supabase
        .from('survey_sets')
        .select('*')
        .eq('id', surveySetId)
        .single();

      if (surveySetError) throw surveySetError;
      setSurveySet(surveySetData);

      // 2. 문항 목록 가져오기
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_set_id', surveySetId)
        .order('question_id');

      if (questionsError) throw questionsError;
      setQuestions(questionsData);
      setError(null);
    } catch (error) {
      console.error('데이터 조회 중 오류 발생:', error.message);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 문항 변경 처리
  const handleQuestionChange = (question, action) => {
    switch (action) {
      case 'add':
        setQuestions([...questions, question]);
        setSuccessMessage(`'${question.question_text}' 문항이 추가되었습니다.`);
        break;
      case 'update':
        setQuestions(questions.map(q => q.id === question.id ? question : q));
        setSuccessMessage(`'${question.question_text}' 문항이 수정되었습니다.`);
        break;
      case 'delete':
        setQuestions(questions.filter(q => q.id !== question.id));
        setSuccessMessage(`'${question.question_text}' 문항이 삭제되었습니다.`);
        break;
      default:
        break;
    }

    // 성공 메시지 표시 후 3초 후 자동으로 사라짐
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <AdminLayout title={`${surveySet?.name || '설문셋'} 문항 관리`}>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link href="/admin/surveys" passHref>
            <Button 
              component="a" 
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: 'none' }}
            >
              설문셋 목록으로 돌아가기
            </Button>
          </Link>
        </Breadcrumbs>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchSurveySetAndQuestions}
        />
      )}

      {loading ? (
        <LoadingSpinner message="설문셋과 문항 데이터를 불러오는 중..." />
      ) : surveySet ? (
        <Paper sx={{ p: 3 }}>
          <QuestionTable 
            surveySet={surveySet} 
            questions={questions} 
            onQuestionChange={handleQuestionChange} 
          />
        </Paper>
      ) : (
        <Alert severity="warning" sx={{ mb: 2 }}>
          설문셋을 찾을 수 없습니다. 올바른 설문셋 ID를 확인해주세요.
        </Alert>
      )}
    </AdminLayout>
  );
} 