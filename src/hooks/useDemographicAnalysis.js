import { useState, useEffect } from 'react';
import { useSurveyAnalysisData } from './useSurveyAnalysisData';

/**
 * 인구통계학적 분석 데이터를 처리하는 hook
 * 
 * @param {string} distributionId - 배포 ID
 * @returns {Object} 인구통계학적 분석에 필요한 데이터와 함수들
 */
export const useDemographicAnalysis = (distributionId) => {
  const {
    loading,
    error,
    distribution,
    surveySets,
    questions,
    responses,
    fetchAnalysisData
  } = useSurveyAnalysisData(distributionId);
  
  const [demographicSurveySetId, setDemographicSurveySetId] = useState(null);
  const [availableDemographics, setAvailableDemographics] = useState([]);
  
  // 인구통계학적 설문셋과 카테고리 찾기
  useEffect(() => {
    if (surveySets.length > 0 && questions.length > 0) {
      // 인구통계학적 설문셋 찾기 
      const demographicSurveySet = surveySets.find(link => 
        link.survey_set?.type?.toLowerCase().includes('demographic')
      );
      
      if (demographicSurveySet) {
        setDemographicSurveySetId(demographicSurveySet.survey_set_id);
        
        // 인구통계학적 카테고리 추출
        const demographicQuestions = questions.filter(q => 
          String(q.survey_set_id) === String(demographicSurveySet.survey_set_id)
        );
        
        const categories = [...new Set(demographicQuestions
          .map(q => q.question_category || q.category)
          .filter(Boolean))];
        
        setAvailableDemographics(categories);
      } else if (surveySets.length > 0) {
        // 인구통계학적 설문셋이 없으면 첫 번째 설문셋 사용
        setDemographicSurveySetId(surveySets[0].survey_set_id);
      }
    }
  }, [surveySets, questions]);
  
  return {
    loading,
    error,
    distribution,
    surveySets,
    questions,
    responses,
    demographicSurveySetId,
    availableDemographics,
    fetchAnalysisData
  };
}; 