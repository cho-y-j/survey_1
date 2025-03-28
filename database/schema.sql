// SQL 스크립트: 데이터베이스 테이블 생성
// 이 파일은 Supabase SQL 에디터에서 실행하기 위한 스크립트입니다.

-- 1. companies 테이블 생성
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. survey_sets 테이블 생성
CREATE TABLE IF NOT EXISTS survey_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. questions 테이블 생성
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_set_id UUID REFERENCES survey_sets(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options TEXT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. survey_distributions 테이블 생성
CREATE TABLE IF NOT EXISTS survey_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  survey_set_ids JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_token TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  target_participants INTEGER,
  current_responses INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. responses 테이블 생성 (업데이트됨)
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_distribution_id UUID REFERENCES survey_distributions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer TEXT,
  user_id UUID,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  upload_batch_id UUID, -- 새 필드 추가: CSV 업로드 배치 식별용
  source TEXT DEFAULT 'direct' -- 새 필드 추가: 데이터 소스 추적 ('direct', 'csv_upload', 'api' 등)
);

-- 6. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 7. vector_embeddings 테이블 생성
CREATE TABLE IF NOT EXISTS vector_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_set_id UUID REFERENCES survey_sets(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536)
);

-- 8. 벡터 검색 함수 생성
CREATE OR REPLACE FUNCTION match_vectors(query_embedding vector(1536), threshold float)
RETURNS TABLE(id uuid, content text, similarity float) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    (embedding <-> query_embedding) AS similarity
  FROM
    vector_embeddings
  WHERE
    (embedding <-> query_embedding) < threshold
  ORDER BY
    similarity ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9. responses 테이블 인덱스 추가 (신규)
CREATE INDEX IF NOT EXISTS idx_responses_survey_distribution_id ON responses(survey_distribution_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_upload_batch_id ON responses(upload_batch_id);

-- 10. 응답 데이터 효율적 삭제를 위한 함수 (신규)
CREATE OR REPLACE FUNCTION delete_responses_by_distribution(dist_id UUID) 
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM responses 
  WHERE survey_distribution_id = dist_id
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. 특정 배치 ID 기반으로 이전 응답 삭제 함수 (신규)
CREATE OR REPLACE FUNCTION retain_latest_batch_responses(dist_id UUID) 
RETURNS INTEGER AS $$
DECLARE
  latest_batch UUID;
  deleted_count INTEGER;
BEGIN
  -- 가장 최근 배치 ID 찾기
  SELECT upload_batch_id INTO latest_batch
  FROM responses
  WHERE survey_distribution_id = dist_id
    AND upload_batch_id IS NOT NULL
  ORDER BY submitted_at DESC
  LIMIT 1;
  
  -- 최신 배치를 제외한 모든 응답 삭제
  IF latest_batch IS NOT NULL THEN
    DELETE FROM responses 
    WHERE survey_distribution_id = dist_id
      AND (upload_batch_id IS NULL OR upload_batch_id != latest_batch)
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. 문항별 응답 통계를 한 번에 가져오는 함수
CREATE OR REPLACE FUNCTION get_item_response_stats(
  dist_id UUID,
  survey_set_id UUID DEFAULT NULL
)
RETURNS TABLE(
  question_id UUID,
  question_text TEXT,
  question_type TEXT,
  question_category TEXT,
  response_count INTEGER,
  avg_value NUMERIC,
  frequencies JSONB,
  participant_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH participants AS (
    SELECT COUNT(DISTINCT user_id) AS count
    FROM responses
    WHERE survey_distribution_id = dist_id
  ),
  relevant_questions AS (
    SELECT q.id, q.question_text, q.question_type, q.question_category
    FROM questions q
    WHERE (survey_set_id IS NULL OR q.survey_set_id = survey_set_id)
  )
  SELECT 
    q.id AS question_id,
    q.question_text,
    q.question_type,
    q.question_category,
    COUNT(r.id) AS response_count,
    CASE 
      WHEN q.question_type IN ('scale_5', 'scale_7') THEN 
        AVG(NULLIF(r.answer, '')::NUMERIC)
      ELSE NULL
    END AS avg_value,
    CASE
      WHEN q.question_type IN ('single_choice', 'multiple_choice') THEN
        jsonb_object_agg(
          COALESCE(r.answer, 'no_answer'), 
          COUNT(r.id)
        )
      ELSE NULL
    END AS frequencies,
    (SELECT count FROM participants) AS participant_count
  FROM 
    relevant_questions q
    LEFT JOIN responses r ON q.id = r.question_id AND r.survey_distribution_id = dist_id
  GROUP BY 
    q.id, q.question_text, q.question_type, q.question_category;
END;
$$ LANGUAGE plpgsql;

-- 13. 카테고리별 응답 통계를 한 번에 가져오는 함수
CREATE OR REPLACE FUNCTION get_category_stats(
  dist_id UUID,
  survey_set_id UUID DEFAULT NULL
)
RETURNS TABLE(
  category TEXT,
  question_count INTEGER,
  avg_scale_value NUMERIC,
  category_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH category_questions AS (
    SELECT 
      q.question_category,
      q.id,
      q.question_text,
      q.question_type
    FROM 
      questions q
    WHERE 
      (survey_set_id IS NULL OR q.survey_set_id = survey_set_id)
    GROUP BY 
      q.question_category, q.id, q.question_text, q.question_type
  ),
  category_responses AS (
    SELECT 
      q.question_category,
      q.id,
      q.question_text,
      q.question_type,
      r.answer,
      COUNT(r.id) AS response_count
    FROM 
      category_questions q
      LEFT JOIN responses r ON q.id = r.question_id AND r.survey_distribution_id = dist_id
    GROUP BY 
      q.question_category, q.id, q.question_text, q.question_type, r.answer
  )
  SELECT 
    cr.question_category AS category,
    COUNT(DISTINCT cr.id) AS question_count,
    AVG(CASE WHEN cr.question_type IN ('scale_5', 'scale_7') 
        THEN NULLIF(cr.answer, '')::NUMERIC 
        ELSE NULL END) AS avg_scale_value,
    jsonb_build_object(
      'questions', jsonb_agg(
        jsonb_build_object(
          'id', cr.id,
          'text', cr.question_text,
          'type', cr.question_type,
          'response_count', cr.response_count,
          'avg_value', CASE WHEN cr.question_type IN ('scale_5', 'scale_7') 
                         THEN AVG(NULLIF(cr.answer, '')::NUMERIC) 
                         ELSE NULL END
        )
      )
    ) AS category_data
  FROM 
    category_responses cr
  GROUP BY 
    cr.question_category;
END;
$$ LANGUAGE plpgsql;

-- 14. 결과 분석 캐시 테이블 추가
CREATE TABLE IF NOT EXISTS analysis_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_distribution_id UUID REFERENCES survey_distributions(id) ON DELETE CASCADE,
  survey_set_id UUID REFERENCES survey_sets(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL,
  cache_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. 분석 캐시 인덱스 추가
CREATE INDEX idx_analysis_cache_lookup ON analysis_cache(survey_distribution_id, survey_set_id, cache_type);

-- 16. 캐시 생성/업데이트 함수
CREATE OR REPLACE FUNCTION update_analysis_cache(
  dist_id UUID,
  set_id UUID,
  c_type TEXT,
  c_data JSONB
) RETURNS UUID AS $$
DECLARE
  cache_id UUID;
BEGIN
  -- 기존 캐시가 있는지 확인
  SELECT id INTO cache_id FROM analysis_cache
  WHERE survey_distribution_id = dist_id
    AND survey_set_id = set_id
    AND cache_type = c_type;
    
  -- 있으면 업데이트, 없으면 새로 생성
  IF cache_id IS NOT NULL THEN
    UPDATE analysis_cache
    SET cache_data = c_data,
        updated_at = NOW()
    WHERE id = cache_id;
    RETURN cache_id;
  ELSE
    INSERT INTO analysis_cache (
      survey_distribution_id, survey_set_id, cache_type, cache_data
    ) VALUES (
      dist_id, set_id, c_type, c_data
    )
    RETURNING id INTO cache_id;
    RETURN cache_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
