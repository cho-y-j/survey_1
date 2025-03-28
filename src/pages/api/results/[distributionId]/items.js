import { supabase } from '@/utils/supabase';

// 기존 쿼리 대신 모든 응답을 가져오기 위한 페이지네이션 구현
async function fetchAllResponses(distributionId, questionIds) {
  const PAGE_SIZE = 1000; // Supabase의 기본 최대 행 수
  let allResponses = [];
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error, count } = await supabase
      .from('responses')
      .select('id, question_id, answer, user_id', { count: 'exact' })
      .eq('survey_distribution_id', distributionId)
      .in('question_id', questionIds)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (error) {
      console.error(`응답 데이터 페이지 ${page} 조회 오류:`, error);
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
  
  return allResponses;
}

export default async function handler(req, res) {
  try {
    const { distributionId } = req.query;
    const surveySetId = req.query.surveySetId;

    if (!distributionId || !surveySetId) {
      return res.status(400).json({ message: 'distributionId와 surveySetId가 필요합니다.' });
    }

    // 문항 조회
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, question_type, question_category')
      .eq('survey_set_id', surveySetId);

    if (questionsError) {
      console.error('문항 조회 오류:', questionsError);
      return res.status(500).json({ message: '문항 조회 중 오류 발생' });
    }

    if (!questions || questions.length === 0) {
      return res.status(200).json({ 
        data: { items: [] }, 
        message: '설문셋에 대한 문항이 없습니다.' 
      });
    }

    // 수정된 부분: 모든 응답 데이터 가져오기
    const questionIds = questions.map(q => q.id);
    const responses = await fetchAllResponses(distributionId, questionIds);

    console.log(`조회된 문항 수: ${questions.length}, 응답 수: ${responses.length}`);

    // 문항별 응답 데이터 처리
    const items = questions.map(question => {
      const questionResponses = responses.filter(r => r.question_id === question.id);
      const responseCount = questionResponses.length;
      
      // 문항 유형에 따른 통계 계산
      let avgValue = null;
      let frequencies = null;
      
      if (question.question_type === 'scale_5' || question.question_type === 'scale_7') {
        // 척도 문항인 경우 평균 계산
        const numericResponses = questionResponses
          .map(r => r.answer)
          .filter(a => a !== null && a !== undefined && a !== '')
          .map(a => parseFloat(a))
          .filter(n => !isNaN(n));
          
        if (numericResponses.length > 0) {
          const sum = numericResponses.reduce((a, b) => a + b, 0);
          avgValue = parseFloat((sum / numericResponses.length).toFixed(2));
        }
      } else if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
        // 선택형 문항인 경우 빈도 계산
        frequencies = {};
        questionResponses.forEach(r => {
          if (r.answer) {
            try {
              const options = r.answer.split(';'); // 다중 선택의 경우 세미콜론으로 구분
              options.forEach(option => {
                const cleanOption = option.trim();
                if (cleanOption) {
                  frequencies[cleanOption] = (frequencies[cleanOption] || 0) + 1;
                }
              });
            } catch (err) {
              console.warn(`응답 처리 중 오류 (${r.id}):`, err);
            }
          }
        });
      }
      
      // 응답자 수 (중복 제외)
      const uniqueRespondents = new Set(questionResponses.map(r => r.user_id)).size;
      
      return {
        question_id: question.id,
        question_text: question.question_text || '',
        question_type: question.question_type || '',
        question_category: question.question_category || '',
        response_count: responseCount,
        unique_respondents: uniqueRespondents,
        avg_value: avgValue,
        frequencies: frequencies
      };
    });

    return res.status(200).json({ 
      data: { items }, 
      message: '성공',
      stats: {
        total_questions: questions.length,
        total_responses: responses.length,
        unique_respondents: new Set(responses.map(r => r.user_id)).size
      }
    });

  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({ message: '서버 오류 발생' });
  }
} 