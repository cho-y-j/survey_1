import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 설정되지 않은 경우 오류 메시지 출력
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL 또는 Anonymous Key가 설정되지 않았습니다.');
}

// Supabase 클라이언트 생성 및 내보내기
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 데이터베이스 연결 테스트 함수
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('companies').select('*').limit(1);
    
    if (error) {
      console.error('Supabase 연결 테스트 실패:', error.message);
      return { success: false, message: error.message };
    }
    
    return { success: true, message: '연결 성공', data };
  } catch (error) {
    console.error('Supabase 연결 테스트 중 오류 발생:', error.message);
    return { success: false, message: error.message };
  }
};

const fetchDistributions = async () => {
  const { data, error } = await supabase
    .from('survey_distributions')
    .select('*');
  
  // ... 나머지 코드 ...
}
