// Supabase 스키마 확인 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 스키마에 정의된 테이블 목록
const expectedTables = [
  'companies', 
  'survey_sets', 
  'questions', 
  'survey_distributions', 
  'responses', 
  'vector_embeddings'
];

async function checkSchema() {
  try {
    console.log('Supabase 스키마 확인 중...');
    console.log(`Supabase URL: ${supabaseUrl}`);

    // 각 테이블 존재 여부 테스트 
    console.log('\n테이블 존재 확인:');
    
    for (const tableName of expectedTables) {
      try {
        // 각 테이블에서 1개 레코드만 조회해서 테이블 존재 여부 확인
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
          
        if (error) {
          if (error.code === 'PGRST116') {
            // 테이블이 비어있는 경우 (no rows returned)
            console.log(`✅ ${tableName}: 존재함 (비어있음)`);
          } else {
            console.log(`❌ ${tableName}: 오류 - ${error.message}`);
          }
        } else {
          console.log(`✅ ${tableName}: 존재함 (${data.length}개 레코드 샘플 확인)`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: 접근 오류 - ${err.message}`);
      }
    }

    // pgvector 확장 테스트 (벡터 쿼리 기능 테스트)
    console.log('\nvector_embeddings 테이블 테스트:');
    try {
      // vector_embeddings 테이블에서 단순 쿼리 실행
      const { data, error } = await supabase
        .from('vector_embeddings')
        .select('id, content')
        .limit(1);
        
      if (error) {
        console.log(`❌ vector_embeddings 테이블 쿼리 오류: ${error.message}`);
      } else {
        console.log(`✅ vector_embeddings 테이블 쿼리 성공 (${data.length}개 레코드 샘플)`);
      }
    } catch (err) {
      console.log(`❌ vector_embeddings 테이블 접근 오류: ${err.message}`);
    }

  } catch (error) {
    console.error('스키마 확인 중 예상치 못한 오류 발생:', error.message);
  }
}

// 스크립트 실행
checkSchema().then(() => {
  console.log('\n스키마 확인 완료');
}); 