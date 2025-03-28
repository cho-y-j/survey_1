import { supabase } from '@/utils/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { company_id, survey_set_ids } = req.body;

    // 필수 필드 검증
    if (!company_id || !survey_set_ids || !Array.isArray(survey_set_ids) || survey_set_ids.length === 0) {
      return res.status(400).json({ error: '회사 ID와 설문셋 ID 배열이 필요합니다.' });
    }

    // 고유 액세스 토큰 생성
    const access_token = crypto.randomUUID();
    
    // URL 생성
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/survey/${access_token}`;

    // Supabase에 설문 배포 정보 저장
    const { data, error } = await supabase
      .from('survey_distributions')
      .insert({
        company_id,
        survey_set_ids: JSON.stringify(survey_set_ids),
        status: 'active',
        access_token,
        url
      })
      .select();

    if (error) {
      console.error('설문 배포 생성 오류:', error);
      return res.status(500).json({ error: '설문 배포 생성 중 오류가 발생했습니다.' });
    }

    return res.status(200).json({ 
      url, 
      distribution_id: data[0].id 
    });
  } catch (error) {
    console.error('설문 배포 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
