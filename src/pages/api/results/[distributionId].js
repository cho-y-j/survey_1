import { supabase } from '@/utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { distributionId, analysis_type = 'all' } = req.query;

    if (!distributionId) {
      return res.status(400).json({ error: '설문 배포 ID가 필요합니다.' });
    }

    // 설문 배포 정보 조회
    const { data: distribution, error: distributionError } = await supabase
      .from('survey_distributions')
      .select('*, companies(*)')
      .eq('id', distributionId)
      .single();

    if (distributionError || !distribution) {
      console.error('설문 배포 조회 오류:', distributionError);
      return res.status(404).json({ error: '유효하지 않은 설문 배포입니다.' });
    }

    // 설문셋 ID 배열 파싱
    const surveySetIds = JSON.parse(distribution.survey_set_ids);

    // 설문셋 정보 조회
    const { data: surveySets, error: surveySetsError } = await supabase
      .from('survey_sets')
      .select('*')
      .in('id', surveySetIds);

    if (surveySetsError) {
      console.error('설문셋 조회 오류:', surveySetsError);
      return res.status(500).json({ error: '설문셋 조회 중 오류가 발생했습니다.' });
    }

    // 문항 정보 조회
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .in('survey_set_id', surveySetIds);

    if (questionsError) {
      console.error('문항 조회 오류:', questionsError);
      return res.status(500).json({ error: '문항 조회 중 오류가 발생했습니다.' });
    }

    // 응답 데이터 조회
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .eq('survey_distribution_id', distributionId);

    if (responsesError) {
      console.error('응답 조회 오류:', responsesError);
      return res.status(500).json({ error: '응답 조회 중 오류가 발생했습니다.' });
    }

    // 분석 유형에 따른 데이터 처리
    let analysisData = {};

    // 문항별 분석
    if (analysis_type === 'all' || analysis_type === 'item') {
      const itemAnalysis = {};
      
      questions.forEach(question => {
        const questionResponses = responses.filter(r => r.question_id === question.id);
        
        // 문항 유형에 따른 분석
        if (question.question_type === 'scale_7') {
          // 7점 척도 문항 분석
          const values = questionResponses.map(r => parseInt(r.answer)).filter(v => !isNaN(v));
          const sum = values.reduce((acc, val) => acc + val, 0);
          const avg = values.length > 0 ? sum / values.length : 0;
          
          itemAnalysis[question.id] = {
            question,
            responses: questionResponses,
            stats: {
              count: values.length,
              average: avg,
              distribution: [1, 2, 3, 4, 5, 6, 7].map(value => ({
                value,
                count: values.filter(v => v === value).length
              }))
            }
          };
        } else if (question.question_type === 'single_choice') {
          // 단일 선택 문항 분석
          const options = question.options ? question.options.split(',') : [];
          const distribution = {};
          
          options.forEach(option => {
            distribution[option] = 0;
          });
          
          questionResponses.forEach(r => {
            if (r.answer in distribution) {
              distribution[r.answer]++;
            }
          });
          
          itemAnalysis[question.id] = {
            question,
            responses: questionResponses,
            stats: {
              count: questionResponses.length,
              distribution: Object.entries(distribution).map(([option, count]) => ({
                option,
                count
              }))
            }
          };
        } else if (question.question_type === 'text') {
          // 텍스트 문항 분석
          itemAnalysis[question.id] = {
            question,
            responses: questionResponses,
            stats: {
              count: questionResponses.length,
              texts: questionResponses.map(r => r.answer)
            }
          };
        }
      });
      
      analysisData.item = itemAnalysis;
    }

    // 카테고리별 분석
    if (analysis_type === 'all' || analysis_type === 'category') {
      const categoryAnalysis = {};
      
      // 문항 카테고리 추출
      const categories = [...new Set(questions.map(q => q.question_category))];
      
      categories.forEach(category => {
        const categoryQuestions = questions.filter(q => q.question_category === category);
        const categoryQuestionIds = categoryQuestions.map(q => q.id);
        const categoryResponses = responses.filter(r => categoryQuestionIds.includes(r.question_id));
        
        // 척도 문항만 평균 계산
        const scaleQuestions = categoryQuestions.filter(q => q.question_type === 'scale_7');
        const scaleQuestionIds = scaleQuestions.map(q => q.id);
        const scaleResponses = categoryResponses.filter(r => scaleQuestionIds.includes(r.question_id));
        
        const values = scaleResponses.map(r => parseInt(r.answer)).filter(v => !isNaN(v));
        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        
        categoryAnalysis[category] = {
          questions: categoryQuestions,
          stats: {
            count: values.length,
            average: avg,
            questionCount: categoryQuestions.length
          }
        };
      });
      
      analysisData.category = categoryAnalysis;
    }

    // 인구통계학적 연계 분석
    if (analysis_type === 'all' || analysis_type === 'demographic') {
      // 인구통계학적 문항 찾기
      const demographicSurveySet = surveySets.find(s => s.type === 'demographic');
      
      if (demographicSurveySet) {
        const demographicQuestions = questions.filter(q => q.survey_set_id === demographicSurveySet.id);
        const demographicAnalysis = {};
        
        demographicQuestions.forEach(demoQuestion => {
          if (demoQuestion.question_type === 'single_choice') {
            const options = demoQuestion.options ? demoQuestion.options.split(',') : [];
            const demoResponses = responses.filter(r => r.question_id === demoQuestion.id);
            
            // 각 인구통계학적 옵션별 다른 문항 응답 분석
            const optionAnalysis = {};
            
            options.forEach(option => {
              const respondentsWithOption = demoResponses
                .filter(r => r.answer === option)
                .map(r => r.user_id);
              
              // 다른 척도 문항에 대한 평균 계산
              const scaleQuestions = questions.filter(q => 
                q.survey_set_id !== demographicSurveySet.id && 
                q.question_type === 'scale_7'
              );
              
              const scaleAnalysis = {};
              
              scaleQuestions.forEach(scaleQuestion => {
                const scaleResponses = responses.filter(r => 
                  r.question_id === scaleQuestion.id && 
                  respondentsWithOption.includes(r.user_id)
                );
                
                const values = scaleResponses.map(r => parseInt(r.answer)).filter(v => !isNaN(v));
                const sum = values.reduce((acc, val) => acc + val, 0);
                const avg = values.length > 0 ? sum / values.length : 0;
                
                scaleAnalysis[scaleQuestion.id] = {
                  question: scaleQuestion,
                  average: avg,
                  count: values.length
                };
              });
              
              optionAnalysis[option] = {
                respondentCount: respondentsWithOption.length,
                scaleAnalysis
              };
            });
            
            demographicAnalysis[demoQuestion.id] = {
              question: demoQuestion,
              optionAnalysis
            };
          }
        });
        
        analysisData.demographic = demographicAnalysis;
      }
    }

    return res.status(200).json({
      distribution,
      surveySets,
      questions,
      analysis: analysisData
    });
  } catch (error) {
    console.error('결과 분석 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
