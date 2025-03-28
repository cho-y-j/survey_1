import { supabase } from '@/utils/supabase';
import { createObjectCsvStringifier } from 'csv-writer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { distributionId, format = 'csv' } = req.query;

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

    // 응답자별로 데이터 그룹화
    const respondentGroups = {};
    responses.forEach(response => {
      if (!respondentGroups[response.user_id]) {
        respondentGroups[response.user_id] = {};
      }
      
      const question = questions.find(q => q.id === response.question_id);
      if (question) {
        respondentGroups[response.user_id][question.question_id] = response.answer;
      }
    });

    // 데이터 형식에 따른 처리
    if (format === 'json') {
      // JSON 형식으로 반환
      return res.status(200).json({
        distribution,
        questions,
        responses: Object.entries(respondentGroups).map(([userId, answers]) => ({
          user_id: userId || 'anonymous',
          answers
        }))
      });
    } else {
      // CSV 형식으로 반환
      const headers = [
        { id: 'user_id', title: '응답자 ID' },
        ...questions.map(q => ({
          id: q.question_id,
          title: `${q.question_category} - ${q.question_text}`
        }))
      ];

      const csvStringifier = createObjectCsvStringifier({
        header: headers
      });

      const records = Object.entries(respondentGroups).map(([userId, answers]) => {
        const record = { user_id: userId || 'anonymous' };
        
        questions.forEach(question => {
          record[question.question_id] = answers[question.question_id] || '';
        });
        
        return record;
      });

      const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="survey_results_${distributionId}.csv"`);
      return res.status(200).send(csvContent);
    }
  } catch (error) {
    console.error('결과 다운로드 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
