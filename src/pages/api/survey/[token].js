import { supabase } from '@/utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: '설문 토큰이 필요합니다.' });
    }

    // 토큰으로 설문 배포 정보 조회
    const { data: distribution, error: distributionError } = await supabase
      .from('survey_distributions')
      .select('*')
      .eq('access_token', token)
      .eq('status', 'active')
      .single();

    if (distributionError || !distribution) {
      console.error('설문 배포 조회 오류:', distributionError);
      return res.status(404).json({ error: '유효하지 않은 설문 링크입니다.' });
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

    // 설문셋에 속한 문항 조회
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .in('survey_set_id', surveySetIds)
      .order('survey_set_id');

    if (questionsError) {
      console.error('문항 조회 오류:', questionsError);
      return res.status(500).json({ error: '문항 조회 중 오류가 발생했습니다.' });
    }

    // 설문셋별로 문항 그룹화
    const groupedQuestions = {};
    questions.forEach(question => {
      if (!groupedQuestions[question.survey_set_id]) {
        groupedQuestions[question.survey_set_id] = [];
      }
      groupedQuestions[question.survey_set_id].push(question);
    });

    // 응답 데이터 구성
    const responseData = {
      distribution,
      surveySets,
      groupedQuestions
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('설문 조회 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
