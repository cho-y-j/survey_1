import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

/**
 * 설문 분석 데이터를 가져오는 hook
 * 
 * @param {string} distributionId - 배포 ID
 * @param {string|null} initialSurveySetId - 초기 설문셋 ID (선택사항)
 * @returns {Object} 설문 분석에 필요한 데이터와 함수들
 */
export const useSurveyAnalysisData = (distributionId, initialSurveySetId = null) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [surveySets, setSurveySets] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [selectedSurveySetId, setSelectedSurveySetId] = useState(initialSurveySetId);
  const [questionStats, setQuestionStats] = useState({});
  const [categories, setCategories] = useState([]);

  // 배포 정보와 관련 데이터 불러오기
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
      
      // 초기 설문셋 ID 설정
      let surveySetIdToUse = selectedSurveySetId;
      if (!surveySetIdToUse && surveySetLinks.length > 0) {
        surveySetIdToUse = initialSurveySetId || surveySetLinks[0].survey_set_id;
        setSelectedSurveySetId(surveySetIdToUse);
      }
      
      // 4. 문항 정보 조회
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds)
        .order('question_id');
      
      if (questionsError) throw questionsError;
      setQuestions(questionsData);

      // 카테고리 추출
      if (questionsData.length > 0) {
        const uniqueCategories = [...new Set(questionsData
          .filter(q => String(q.survey_set_id) === String(surveySetIdToUse))
          .map(q => q.question_category || q.category || '미분류')
          .filter(Boolean))];
        setCategories(uniqueCategories);
      }
      
      // 5. 문항별 데이터 가져오기 (최적화된 API 호출)
      if (surveySetIdToUse) {
        await fetchItemsData(distributionId, surveySetIdToUse);
      }
      
      setError(null);
    } catch (error) {
      console.error('데이터 조회 오류:', error.message);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 문항별 데이터 및 통계 가져오기
  const fetchItemsData = async (distId, survSetId) => {
    try {
      const response = await fetch(`/api/results/${distId}/items?surveySetId=${survSetId}&includeAllResponses=true`);
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }
      
      const analysisData = await response.json();
      
      // 문항 수와 응답 수 로그 추가
      const items = analysisData.data?.items || [];
      
      // 총 응답 수 계산
      let totalResponses = 0;
      items.forEach(item => {
        totalResponses += parseInt(item.response_count) || 0;
      });
      
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
      
      // 응답 데이터 설정
      if (analysisData.data?.responses) {
        setResponses(analysisData.data.responses);
      }
      
      return statsMap;
    } catch (err) {
      console.error('문항별 데이터 조회 오류:', err);
      throw err;
    }
  };

  // 설문셋 변경 핸들러
  const handleSurveySetChange = (surveySetId) => {
    setSelectedSurveySetId(surveySetId);
  };

  // 문항별 통계 계산 함수
  const calculateQuestionStats = (filteredQuestions, relevantResponses) => {
    const newStats = {};
    // ... 기존 items.js에서 통계 계산 로직
    
    return newStats;
  };

  // 카테고리별 통계 계산 함수
  const calculateCategoryStats = (questionList, stats) => {
    // ... 기존 items.js에서 카테고리 통계 계산 로직
    
    return {};
  };

  // 처음 로드 시 데이터 가져오기
  useEffect(() => {
    if (distributionId) {
      fetchAnalysisData();
    }
  }, [distributionId]);

  // 선택된 설문셋이 변경될 때 문항별 데이터 다시 가져오기
  useEffect(() => {
    if (distributionId && selectedSurveySetId) {
      fetchItemsData(distributionId, selectedSurveySetId)
        .catch(err => {
          setError(`문항별 데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
        });
    }
  }, [distributionId, selectedSurveySetId]);
  
  // 필터링된 문항과 응답 계산
  const filteredQuestions = questions.filter(q => 
    String(q.survey_set_id) === String(selectedSurveySetId)
  );

  const relevantResponses = responses.filter(r => 
    String(r.survey_set_id) === String(selectedSurveySetId)
  );

  return {
    loading,
    error,
    distribution,
    surveySets,
    questions: filteredQuestions,
    responses: relevantResponses,
    selectedSurveySetId,
    handleSurveySetChange,
    questionStats,
    categories,
    fetchAnalysisData,
    fetchItemsData
  };
}; 