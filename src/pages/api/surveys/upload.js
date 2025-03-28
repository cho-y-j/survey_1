import { supabase } from '@/utils/supabase';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { promisify } from 'util';

// 메모리에 파일 저장을 위한 multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

// multer 미들웨어를 promise로 변환
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Next.js API 라우트 config 설정
export const config = {
  api: {
    bodyParser: false, // multer를 사용하기 위해 기본 body parser 비활성화
  },
};

// 질문 유형 상수
const VALID_QUESTION_TYPES = {
  'single_choice': 'single_choice',
  'single': 'single_choice',
  'singlechoice': 'single_choice',
  'multiple_choice': 'multiple_choice',
  'multiple': 'multiple_choice',
  'multiplechoice': 'multiple_choice',
  'scale_5': 'scale_5',
  'scale5': 'scale_5',
  'scale_7': 'scale_7',
  'scale7': 'scale_7',
  'text': 'text'
};

// question_type 정규화 함수
function normalizeQuestionType(type) {
  if (!type) return null;
  
  // 소문자로 변환하고 공백 제거
  const normalizedType = type.toLowerCase().replace(/\s+/g, '');
  
  // 매핑된 타입 반환
  return VALID_QUESTION_TYPES[normalizedType] || null;
}

export default async function handler(req, res) {
  // POST 메소드만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 로깅 객체 생성 (디버깅용)
    const uploadInfo = { 
      fileReceived: false,
      formDataReceived: false,
      originalFileName: null,
      bodyParams: null
    };

    // multer 미들웨어 실행 (단일 파일 업로드)
    await runMiddleware(req, res, upload.single('file'));

    // 업로드된 파일이 없는 경우
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    uploadInfo.fileReceived = true;
    uploadInfo.originalFileName = req.file.originalname;

    // 파일 타입 검증
    if (
      req.file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      req.file.mimetype !== 'application/vnd.ms-excel'
    ) {
      return res.status(400).json({ error: '엑셀 파일만 업로드 가능합니다.' });
    }

    // 버퍼로부터 워크북 읽기
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // 첫 번째 시트 가져오기
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 시트 데이터를 JSON으로 변환
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 데이터가 없으면 에러 반환
    if (data.length === 0) {
      return res.status(400).json({ error: '엑셀 파일에 데이터가 없습니다.' });
    }

    // 필수 필드 확인
    const requiredFields = ['question_id', 'question_category', 'question_text', 'question_type'];
    const missingFields = requiredFields.filter(field => !data[0].hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}` 
      });
    }

    // FormData에서 설문셋 이름과 유형 가져오기
    let surveySetName = req.body.surveySetName;
    let surveySetType = req.body.surveySetType;

    // 값이 없는 경우 기본값 설정
    if (!surveySetName) {
      surveySetName = req.file.originalname.replace(/\.(xlsx|xls)$/, '');
    }
    if (!surveySetType) {
      surveySetType = guessTypeFromQuestions(data);
    }

    console.log("설문셋 업로드 정보:", { 
      uploadInfo,
      finalValues: {
        surveySetName, 
        surveySetType
      }
    });

    // 1. 새 설문셋 생성
    const { data: surveySet, error: createError } = await supabase
      .from('survey_sets')
      .insert([{ 
        name: surveySetName,
        type: surveySetType
      }])
      .select();

    if (createError) {
      throw new Error(`설문셋 생성 오류: ${createError.message}`);
    }

    // 2. 문항 데이터 준비
    const questions = data.map(row => {
      // is_required 필드가 없으면 기본값으로 true 사용
      let isRequired = true;
      if (row.hasOwnProperty('is_required')) {
        if (typeof row.is_required === 'boolean') {
          isRequired = row.is_required;
        } else if (typeof row.is_required === 'number') {
          isRequired = row.is_required === 1;
        } else if (typeof row.is_required === 'string') {
          isRequired = row.is_required.toLowerCase() === 'true' || 
                      row.is_required.toLowerCase() === 'yes' ||
                      row.is_required === '1';
        }
      }

      // question_type 정규화
      const normalizedType = normalizeQuestionType(row.question_type);
      if (!normalizedType) {
        throw new Error(`유효하지 않은 질문 유형입니다: ${row.question_type}`);
      }

      return {
        survey_set_id: surveySet[0].id,
        question_id: row.question_id,
        question_category: row.question_category,
        question_text: row.question_text,
        question_type: normalizedType,  // 정규화된 타입 사용
        options: row.options ? String(row.options) : '',  // 옵션이 없으면 빈 문자열
        is_required: isRequired
      };
    });

    // 3. 문항 데이터 삽입
    const { error: insertError } = await supabase
      .from('questions')
      .insert(questions);

    if (insertError) {
      // 문항 삽입 실패 시 생성된 설문셋도 삭제
      await supabase
        .from('survey_sets')
        .delete()
        .eq('id', surveySet[0].id);
      
      throw new Error(`문항 생성 오류: ${insertError.message}`);
    }

    // 성공 응답
    return res.status(200).json({
      success: true,
      surveySet: surveySet[0],
      questionCount: questions.length
    });

  } catch (error) {
    console.error('엑셀 파일 업로드 처리 중 오류 발생:', error);
    return res.status(500).json({ error: `서버 오류: ${error.message}` });
  }
}

// 문항 정보를 기반으로 설문 유형 유추
function guessTypeFromQuestions(questions) {
  // 기본 카테고리 빈도 계산
  const categoryCount = {};
  
  questions.forEach(q => {
    const category = q.question_category;
    if (category) {
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    }
  });

  // 가장 많이 등장한 카테고리 찾기
  let maxCategory = null;
  let maxCount = 0;
  
  for (const [category, count] of Object.entries(categoryCount)) {
    if (count > maxCount) {
      maxCount = count;
      maxCategory = category;
    }
  }

  // 카테고리에 따른 유형 결정
  if (maxCategory) {
    if (maxCategory.includes('소속') || maxCategory.includes('인구') || maxCategory.includes('나이') || maxCategory.includes('학력')) {
      return 'demographic';
    } else if (maxCategory.includes('조직') || maxCategory.includes('문화')) {
      return 'organizational';
    } else if (maxCategory.includes('만족') || maxCategory.includes('행복')) {
      return 'satisfaction';
    } else if (maxCategory.includes('몰입') || maxCategory.includes('업무')) {
      return 'engagement';
    } else if (maxCategory.includes('리더') || maxCategory.includes('상사')) {
      return 'leadership';
    }
  }

  // 기본값
  return 'organizational';
} 