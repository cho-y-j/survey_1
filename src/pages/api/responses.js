import { supabase } from '@/utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { survey_distribution_id, responses } = req.body;

    // 필수 필드 검증
    if (!survey_distribution_id || !responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ error: '설문 배포 ID와 응답 배열이 필요합니다.' });
    }

    // 설문 배포 정보 확인
    const { data: distribution, error: distributionError } = await supabase
      .from('survey_distributions')
      .select('*')
      .eq('id', survey_distribution_id)
      .eq('status', 'active')
      .single();

    if (distributionError || !distribution) {
      console.error('설문 배포 조회 오류:', distributionError);
      return res.status(404).json({ error: '유효하지 않은 설문 배포입니다.' });
    }

    // 응답 데이터 준비
    const responsesData = responses.map(response => ({
      survey_distribution_id,
      question_id: response.question_id,
      answer: response.answer,
      submitted_at: new Date()
    }));

    // Supabase에 응답 저장
    const { data, error } = await supabase
      .from('responses')
      .insert(responsesData);

    if (error) {
      console.error('응답 저장 오류:', error);
      return res.status(500).json({ error: '응답 저장 중 오류가 발생했습니다.' });
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('응답 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
