// Supabase 테이블 상세 비교 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// schema.sql 파일에서 테이블 구조 정보 추출 (간단한 파싱)
function parseSchemaFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tableDefinitions = {};
    
    // 현재 처리 중인 테이블 이름
    let currentTable = null;
    let collectingColumns = false;
    let columns = [];
    
    // 파일을 줄 단위로 읽기
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 테이블 생성 시작 감지
      if (trimmedLine.startsWith('CREATE TABLE') && trimmedLine.includes('(')) {
        collectingColumns = true;
        // 테이블 이름 추출
        const tableNameMatch = trimmedLine.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/);
        if (tableNameMatch && tableNameMatch[1]) {
          currentTable = tableNameMatch[1];
          columns = [];
        }
      } 
      // 컬럼 정보 수집
      else if (collectingColumns && currentTable && trimmedLine.includes(' ')) {
        // 닫는 괄호가 있는지 확인
        if (trimmedLine === ');') {
          collectingColumns = false;
          tableDefinitions[currentTable] = columns;
          currentTable = null;
        } else {
          // 컬럼 정의 추출 (쉼표로 끝나는 라인)
          const columnInfo = trimmedLine.replace(/,$/, '').trim();
          if (columnInfo && !columnInfo.startsWith('--') && columnInfo !== '(') {
            columns.push(columnInfo);
          }
        }
      }
    }
    
    return tableDefinitions;
  } catch (error) {
    console.error('스키마 파일 파싱 중 오류 발생:', error.message);
    return {};
  }
}

// Supabase에서 실제 테이블 구조 가져오기
async function getTableStructure(tableName) {
  try {
    console.log(`${tableName} 테이블 구조 확인 중...`);
    
    // 간단한 쿼리로 테이블 존재 여부 확인
    const { error: tableError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code !== 'PGRST116') {
      console.error(`${tableName} 테이블 접근 오류:`, tableError.message);
      return null;
    }
    
    // 테이블 구조 쿼리 - PostgreSQL의 column_type을 직접 확인하기 위한 SQL 실행
    // Supabase RLS 정책 때문에 직접 실행이 안되면 에러를 캐치하도록 함
    try {
      // 각 테이블의 첫 번째 행 가져오기
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sampleError && sampleError.code !== 'PGRST116') {
        throw new Error(`샘플 데이터 쿼리 오류: ${sampleError.message}`);
      }
      
      // 샘플 데이터가 없으면 테이블 구조만 반환
      if (!sampleData || sampleData.length === 0) {
        return { exists: true, columns: [], sample: null };
      }
      
      // 샘플 데이터에서 컬럼 구조 추출
      const columns = Object.keys(sampleData[0]).map(columnName => {
        const value = sampleData[0][columnName];
        let dataType = typeof value;
        
        // 특별한 타입 처리
        if (value === null) {
          dataType = 'unknown (null)';
        } else if (dataType === 'object') {
          if (Array.isArray(value)) {
            dataType = 'array';
          } else if (value instanceof Date) {
            dataType = 'timestamp';
          } else {
            dataType = 'json';
          }
        }
        
        return { name: columnName, type: dataType };
      });
      
      return { exists: true, columns, sample: sampleData[0] };
    } catch (err) {
      console.log(`${tableName} 테이블 상세 구조 확인 불가: ${err.message}`);
      return { exists: true, columns: [], error: err.message };
    }
  } catch (error) {
    console.error(`${tableName} 테이블 구조 확인 중 오류 발생:`, error.message);
    return { exists: false, error: error.message };
  }
}

// 스키마 파일과 실제 테이블 비교
async function compareSchemaWithDatabase() {
  console.log('스키마 파일과 데이터베이스 비교 시작...\n');
  
  // 파일에서 스키마 정의 파싱
  const schemaDefinitions = parseSchemaFile('./database/schema.sql');
  
  // 정의된 테이블 이름 목록
  const definedTables = Object.keys(schemaDefinitions);
  
  console.log(`스키마 파일에서 정의된 테이블: ${definedTables.length}개`);
  
  // 각 테이블 비교
  for (const tableName of definedTables) {
    console.log(`\n========== ${tableName} 테이블 ==========`);
    
    const definedColumns = schemaDefinitions[tableName];
    console.log(`- 스키마 정의: ${definedColumns.length}개 칼럼`);
    definedColumns.forEach(col => console.log(`  ${col}`));
    
    // 실제 테이블 구조 확인
    const actualTable = await getTableStructure(tableName);
    
    if (!actualTable || !actualTable.exists) {
      console.log(`❌ 실제 테이블 존재하지 않음 또는 접근 불가`);
      continue;
    }
    
    console.log(`- 실제 테이블 존재함 (${actualTable.columns.length}개 칼럼 확인됨)`);
    
    if (actualTable.columns.length > 0) {
      actualTable.columns.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
      });
    }
    
    if (actualTable.sample) {
      console.log(`- 샘플 데이터: `);
      console.log(JSON.stringify(actualTable.sample, null, 2).substring(0, 200) + (JSON.stringify(actualTable.sample).length > 200 ? '...' : ''));
    }
    
    if (actualTable.error) {
      console.log(`- 접근 제한 오류: ${actualTable.error}`);
    }
  }
}

// 실행
compareSchemaWithDatabase().then(() => {
  console.log('\n스키마 비교 완료');
}); 