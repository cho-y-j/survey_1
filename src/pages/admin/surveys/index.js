import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import SurveySetTable from '@/components/admin/SurveySetTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { Paper, Typography, Box, Alert } from '@mui/material';

export default function SurveysPage() {
  const [surveySets, setSurveySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSurveySets();
  }, []);

  // 설문셋 데이터 가져오기
  const fetchSurveySets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('survey_sets')
        .select('*')
        .order('name');

      if (error) throw error;
      setSurveySets(data);
      setError(null);
    } catch (error) {
      console.error('설문셋 데이터 조회 중 오류 발생:', error.message);
      setError(`설문셋 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 설문셋 데이터 변경 처리
  const handleSurveySetChange = (surveySet, action) => {
    switch (action) {
      case 'add':
        setSurveySets([...surveySets, surveySet]);
        setSuccessMessage(`'${surveySet.name}' 설문셋이 추가되었습니다.`);
        break;
      case 'update':
        setSurveySets(surveySets.map(s => s.id === surveySet.id ? surveySet : s));
        setSuccessMessage(`'${surveySet.name}' 설문셋 정보가 수정되었습니다.`);
        break;
      case 'delete':
        setSurveySets(surveySets.filter(s => s.id !== surveySet.id));
        setSuccessMessage(`'${surveySet.name}' 설문셋이 삭제되었습니다.`);
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
    <AdminLayout title="설문셋 관리">
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchSurveySets}
        />
      )}

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <LoadingSpinner message="설문셋 데이터를 불러오는 중..." />
        ) : (
          <SurveySetTable 
            surveySets={surveySets} 
            onSurveySetChange={handleSurveySetChange} 
          />
        )}
      </Paper>
    </AdminLayout>
  );
} 