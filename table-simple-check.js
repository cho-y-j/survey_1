// Supabase 테이블 간단 비교 스크립트
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

// 스키마에 정의된 테이블 및 컬럼 정보 (수동으로 입력)
const expectedSchema = {
  companies: {
    columns: ['id', 'name', 'created_at'],
    types: ['UUID', 'TEXT', 'TIMESTAMP WITH TIME ZONE'],
    primary: 'id'
  },
  survey_sets: {
    columns: ['id', 'name', 'type', 'created_at'],
    types: ['UUID', 'TEXT', 'TEXT', 'TIMESTAMP WITH TIME ZONE'],
    primary: 'id'
  },
  questions: {
    columns: ['id', 'survey_set_id', 'question_id', 'question_category', 'question_text', 'question_type', 'options', 'is_required', 'created_at'],
    types: ['UUID', 'UUID', 'TEXT', 'TEXT', 'TEXT', 'TEXT', 'TEXT', 'BOOLEAN', 'TIMESTAMP WITH TIME ZONE'],
    primary: 'id',
    foreign: { survey_set_id: 'survey_sets(id)' }
  },
  survey_distributions: {
    columns: ['id', 'company_id', 'title', 'survey_set_ids', 'status', 'created_at', 'access_token', 'url'],
    types: ['UUID', 'UUID', 'TEXT', 'JSONB', 'TEXT', 'TIMESTAMP WITH TIME ZONE', 'TEXT', 'TEXT'],
    primary: 'id',
    foreign: { company_id: 'companies(id)' }
  },
  responses: {
    columns: ['id', 'survey_distribution_id', 'question_id', 'answer', 'user_id', 'submitted_at'],
    types: ['UUID', 'UUID', 'UUID', 'TEXT', 'UUID', 'TIMESTAMP WITH TIME ZONE'],
    primary: 'id',
    foreign: { 
      survey_distribution_id: 'survey_distributions(id)',
      question_id: 'questions(id)'
    }
  },
  vector_embeddings: {
    columns: ['id', 'survey_set_id', 'question_id', 'content', 'embedding'],
    types: ['UUID', 'UUID', 'UUID', 'TEXT', 'VECTOR(1536)'],
    primary: 'id',
    foreign: {
      survey_set_id: 'survey_sets(id)',
      question_id: 'questions(id)'
    }
  }
};

// 테이블 구조 확인 함수
async function checkTableStructure(tableName, expectedColumns) {
  try {
    console.log(`\n========== ${tableName} 테이블 확인 중 ==========`);
    
    // 1. 테이블 존재 확인
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.log(`❌ 테이블 접근 오류: ${error.message}`);
      return { exists: false, error: error.message };
    }
    
    console.log(`✅ 테이블 존재함`);
    
    // 2. 데이터가 있으면 컬럼 구조 확인
    if (data && data.length > 0) {
      const actualColumns = Object.keys(data[0]);
      console.log(`- 실제 컬럼: ${actualColumns.length}개`);
      console.log(`  ${actualColumns.join(', ')}`);
      
      // 예상 컬럼과 비교
      console.log(`- 예상 컬럼: ${expectedColumns.length}개`);
      console.log(`  ${expectedColumns.join(', ')}`);
      
      // 누락된 컬럼 확인
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log(`❌ 누락된 컬럼: ${missingColumns.join(', ')}`);
      } else {
        console.log(`✅ 모든 예상 컬럼이 존재함`);
      }
      
      // 추가된 컬럼 확인
      const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
      if (extraColumns.length > 0) {
        console.log(`ℹ️ 추가 컬럼: ${extraColumns.join(', ')}`);
      }
      
      // 샘플 데이터 표시
      console.log(`- 샘플 데이터:`);
      console.log(JSON.stringify(data[0], null, 2).substring(0, 500) + 
        (JSON.stringify(data[0]).length > 500 ? '...' : ''));
      
      return { exists: true, columns: actualColumns, sample: data[0] };
    } else {
      console.log(`- 테이블에 데이터가 없음, 컬럼 구조 확인 불가`);
      console.log(`- 예상 컬럼: ${expectedColumns.join(', ')}`);
      return { exists: true, empty: true };
    }
  } catch (error) {
    console.error(`테이블 확인 중 오류 발생:`, error.message);
    return { exists: false, error: error.message };
  }
}

// 모든 테이블 확인 함수
async function checkAllTables() {
  console.log('Supabase 테이블 구조 확인 시작...');
  console.log(`Supabase URL: ${supabaseUrl}\n`);
  
  // 각 테이블별 확인
  for (const [tableName, schema] of Object.entries(expectedSchema)) {
    await checkTableStructure(tableName, schema.columns);
  }
}

// 스크립트 실행
checkAllTables().then(() => {
  console.log('\n테이블 확인 완료');
}); 