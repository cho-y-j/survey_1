import { useState, useEffect } from 'react';
import { useSurveyAnalysisData } from './useSurveyAnalysisData';

/**
 * 상관관계 분석 데이터를 처리하는 hook
 * 
 * @param {string} distributionId - 배포 ID
 * @returns {Object} 상관관계 분석에 필요한 데이터와 함수들
 */
export const useCorrelationAnalysis = (distributionId) => {
  const {
    loading,
    error,
    distribution,
    surveySets,
    questions,
    responses,
    fetchAnalysisData
  } = useSurveyAnalysisData(distributionId);
  
  const [participants, setParticipants] = useState([]);
  const [demographicSurveySetId, setDemographicSurveySetId] = useState(null);
  const [otherSurveySetId, setOtherSurveySetId] = useState(null);
  const [availableDemographics, setAvailableDemographics] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  
  // 참여자, 인구통계학적 설문셋, 카테고리 정보 처리
  useEffect(() => {
    if (surveySets.length > 0 && questions.length > 0 && responses.length > 0) {
      // 참여자 목록 생성 (user_id 기반)
      const uniqueParticipantIds = [...new Set(responses.map(resp => resp.user_id))];
      const participantList = uniqueParticipantIds.map(userId => ({
        id: userId
      }));
      
      setParticipants(participantList);
      
      // 인구통계학적 설문셋 찾기
      const demographicSet = surveySets.find(link => 
        link.survey_set?.type?.toLowerCase().includes('demographic')
      );
      
      if (demographicSet) {
        setDemographicSurveySetId(demographicSet.survey_set_id);
        
        // 인구통계학적 설문셋이 아닌 첫 번째 설문셋 찾기
        const otherSet = surveySets.find(link => 
          link.survey_set_id !== demographicSet.survey_set_id
        );
        
        if (otherSet) {
          setOtherSurveySetId(otherSet.survey_set_id);
        } else {
          // 다른 설문셋이 없으면 인구통계학적 설문셋 사용
          setOtherSurveySetId(demographicSet.survey_set_id);
        }
        
        // 인구통계학적 카테고리 추출
        const demographicQuestions = questions.filter(q => 
          String(q.survey_set_id) === String(demographicSet.survey_set_id)
        );
        
        const demographics = [...new Set(demographicQuestions
          .map(q => q.question_category || q.category)
          .filter(Boolean))];
        
        setAvailableDemographics(demographics);
      } else if (surveySets.length > 0) {
        // 인구통계학적 설문셋이 없으면 첫 번째 설문셋 사용
        setDemographicSurveySetId(surveySets[0].survey_set_id);
        
        // 두 번째 설문셋이 있으면 사용, 없으면 첫 번째 설문셋 사용
        setOtherSurveySetId(surveySets.length > 1 
          ? surveySets[1].survey_set_id 
          : surveySets[0].survey_set_id);
      }
      
      // 모든 카테고리 추출
      const allCategories = [...new Set(questions
        .map(q => q.question_category || q.category)
        .filter(Boolean))];
      
      setAvailableCategories(allCategories);
    }
  }, [surveySets, questions, responses]);
  
  return {
    loading,
    error,
    distribution,
    surveySets,
    questions,
    responses,
    participants,
    demographicSurveySetId,
    otherSurveySetId,
    availableDemographics,
    availableCategories,
    fetchAnalysisData
  };
}; 