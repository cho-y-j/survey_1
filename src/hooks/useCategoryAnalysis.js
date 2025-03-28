import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSurveyAnalysisData } from './useSurveyAnalysisData';

/**
 * 카테고리 분석 데이터를 처리하는 hook
 * 
 * @param {string} distributionId - 배포 ID
 * @param {string|null} initialSurveySetId - 초기 설문셋 ID (선택사항)
 * @returns {Object} 카테고리 분석에 필요한 데이터와 함수들
 */
export const useCategoryAnalysis = (distributionId, initialSurveySetId = null) => {
  const router = useRouter();
  
  const {
    loading,
    error,
    distribution,
    surveySets,
    questions,
    responses,
    selectedSurveySetId,
    handleSurveySetChange,
    categories,
    fetchAnalysisData
  } = useSurveyAnalysisData(distributionId, initialSurveySetId);
  
  // 설문셋 선택 변경 처리 (URL 파라미터 업데이트 포함)
  const changeSurveySet = (surveySetId) => {
    handleSurveySetChange(surveySetId);
    
    // URL 파라미터 업데이트
    router.push({
      pathname: router.pathname,
      query: { 
        ...router.query, 
        surveySetId 
      }
    }, undefined, { shallow: true });
  };
  
  // 카테고리별 질문 및 응답 필터링
  const getCategoryQuestions = (category) => {
    return questions.filter(q => 
      (q.question_category || q.category) === category
    );
  };
  
  const getCategoryResponses = (category) => {
    const categoryQuestions = getCategoryQuestions(category);
    const questionIds = categoryQuestions.map(q => q.id || q.question_id);
    
    return responses.filter(r => 
      questionIds.includes(r.question_id)
    );
  };
  
  return {
    loading,
    error,
    distribution,
    surveySets,
    questions,
    responses,
    selectedSurveySetId,
    changeSurveySet,
    categories,
    getCategoryQuestions,
    getCategoryResponses,
    fetchAnalysisData
  };
}; 