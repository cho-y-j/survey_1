import { supabase } from '@/utils/supabase';
import { parse } from 'csv-parse/sync';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { distributionId } = req.query;

    if (!distributionId) {
      return res.status(400).json({ error: '설문 배포 ID가 필요합니다.' });
    }

    // 설문 배포 정보 확인
    const { data: distribution, error: distributionError } = await supabase
      .from('survey_distributions')
      .select('*')
      .eq('id', distributionId)
      .single();

    if (distributionError || !distribution) {
      console.error('설문 배포 조회 오류:', distributionError);
      return res.status(404).json({ error: '유효하지 않은 설문 배포입니다.' });
    }

    // 문항 정보 조회
    const surveySetIds = JSON.parse(distribution.survey_set_ids);
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .in('survey_set_id', surveySetIds);

    if (questionsError) {
      console.error('문항 조회 오류:', questionsError);
      return res.status(500).json({ error: '문항 조회 중 오류가 발생했습니다.' });
    }

    // CSV 파일 파싱
    const form = new formidable.IncomingForm();
    
    const parseForm = () => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });
    };

    const { files } = await parseForm();
    const csvFile = files.file;

    if (!csvFile) {
      return res.status(400).json({ error: 'CSV 파일이 필요합니다.' });
    }

    const csvContent = fs.readFileSync(csvFile.filepath, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    // 응답 데이터 준비
    const responsesData = [];
    let count = 0;

    for (const record of records) {
      const userId = record['응답자 ID'] || crypto.randomUUID();
      
      for (const question of questions) {
        const answer = record[question.question_id];
        
        if (answer !== undefined && answer !== '') {
          responsesData.push({
            survey_distribution_id: distributionId,
            question_id: question.id,
            answer,
            user_id: userId,
            submitted_at: new Date()
          });
          count++;
        }
      }
    }

    // Supabase에 응답 저장
    if (responsesData.length > 0) {
      const { error } = await supabase
        .from('responses')
        .insert(responsesData);

      if (error) {
        console.error('응답 저장 오류:', error);
        return res.status(500).json({ error: '응답 저장 중 오류가 발생했습니다.' });
      }
    }

    return res.status(200).json({ 
      status: 'success', 
      count,
      message: `${count}개의 응답이 성공적으로 업로드되었습니다.`
    });
  } catch (error) {
    console.error('결과 업로드 처리 중 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
