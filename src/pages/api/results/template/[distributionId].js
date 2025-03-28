import { supabase } from '@/utils/supabase';
import { createObjectCsvStringifier } from 'csv-writer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { distributionId } = req.query;

    if (!distributionId) {
      return res.status(400).json({ error: '설문 배포 ID가 필요합니다.' });
    }

    // 설문 배포 정보 조회
    const { data: distribution, error: distributionError } = await supabase
      .from('survey_distributions')
      .select('*')
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

    // CSV 템플릿 생성
    const headers = [
      { id: '응답자 ID', title: '응답자 ID' },
      ...questions.map(q => ({
        id: q.question_id,
        title: `${q.question_category} - ${q.question_text}`
      }))
    ];

    const csvStringifier = createObjectCsvStringifier({
      header: headers
    });

    // 샘플 레코드 생성 (빈 템플릿)
    const sampleRecord = { '응답자 ID': 'user1' };
    questions.forEach(question => {
      // 문항 유형에 따른 샘플 값 설정
      if (question.question_type === 'scale_7') {
        sampleRecord[question.question_id] = '4';
      } else if (question.question_type === 'single_choice' && question.options) {
        const options = question.options.split(',');
        sampleRecord[question.question_id] = options[0] || '';
      } else if (question.question_type === 'text') {
        sampleRecord[question.question_id] = '샘플 텍스트 응답';
      } else {
        sampleRecord[question.question_id] = '';
      }
    });

    // 두 번째 샘플 레코드 추가
    const sampleRecord2 = { '응답자 ID': 'user2' };
    questions.forEach(question => {
      if (question.question_type === 'scale_7') {
        sampleRecord2[question.question_id] = '5';
      } else if (question.question_type === 'single_choice' && question.options) {
        const options = question.options.split(',');
        sampleRecord2[question.question_id] = options.length > 1 ? options[1] : options[0] || '';
      } else if (question.question_type === 'text') {
        sampleRecord2[question.question_id] = '다른 샘플 텍스트 응답';
      } else {
        sampleRecord2[question.question_id] = '';
      }
    });

    const csvContent = csvStringifier.getHeaderString() + 
                      csvStringifier.stringifyRecords([sampleRecord, sampleRecord2]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="survey_template_${distributionId}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('템플릿 다운로드 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
