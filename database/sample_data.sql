// 샘플 데이터 생성 스크립트
// 이 파일은 Supabase SQL 에디터에서 실행하기 위한 스크립트입니다.

-- 1. 샘플 회사 데이터 삽입
INSERT INTO companies (name) VALUES
  ('테스트 회사 A'),
  ('테스트 회사 B'),
  ('테스트 회사 C');

-- 2. 샘플 설문셋 데이터 삽입
INSERT INTO survey_sets (name, type) VALUES
  ('인구통계학적 설문', 'demographic'),
  ('조직문화 설문', 'organizational'),
  ('업무몰입도 설문', 'engagement');

-- 3. 샘플 문항 데이터 삽입
-- 인구통계학적 설문 문항
INSERT INTO questions (survey_set_id, question_id, question_category, question_text, question_type, options, is_required) VALUES
  ((SELECT id FROM survey_sets WHERE name = '인구통계학적 설문'), 'demo_gender', '기본정보', '귀하의 성별은 무엇입니까?', 'single_choice', '남성,여성,기타,응답하지 않음', true),
  ((SELECT id FROM survey_sets WHERE name = '인구통계학적 설문'), 'demo_age', '기본정보', '귀하의 연령대는 어떻게 되십니까?', 'single_choice', '20대 이하,20대,30대,40대,50대,60대 이상', true),
  ((SELECT id FROM survey_sets WHERE name = '인구통계학적 설문'), 'demo_position', '직무정보', '귀하의 직급은 어떻게 되십니까?', 'single_choice', '사원,대리,과장,차장,부장,임원', true);

-- 조직문화 설문 문항
INSERT INTO questions (survey_set_id, question_id, question_category, question_text, question_type, options, is_required) VALUES
  ((SELECT id FROM survey_sets WHERE name = '조직문화 설문'), 'culture_communication', '소통', '우리 회사는 부서 간 소통이 원활하다.', 'scale_7', '1,2,3,4,5,6,7', true),
  ((SELECT id FROM survey_sets WHERE name = '조직문화 설문'), 'culture_innovation', '혁신', '우리 회사는 혁신적인 아이디어를 장려한다.', 'scale_7', '1,2,3,4,5,6,7', true),
  ((SELECT id FROM survey_sets WHERE name = '조직문화 설문'), 'culture_feedback', '피드백', '우리 회사는 건설적인 피드백 문화가 있다.', 'scale_7', '1,2,3,4,5,6,7', true);

-- 업무몰입도 설문 문항
INSERT INTO questions (survey_set_id, question_id, question_category, question_text, question_type, options, is_required) VALUES
  ((SELECT id FROM survey_sets WHERE name = '업무몰입도 설문'), 'engage_satisfaction', '만족도', '나는 현재 업무에 만족한다.', 'scale_7', '1,2,3,4,5,6,7', true),
  ((SELECT id FROM survey_sets WHERE name = '업무몰입도 설문'), 'engage_purpose', '목적성', '나는 내 업무가 회사의 목표에 기여한다고 느낀다.', 'scale_7', '1,2,3,4,5,6,7', true),
  ((SELECT id FROM survey_sets WHERE name = '업무몰입도 설문'), 'engage_growth', '성장', '나는 회사에서 성장 기회를 얻고 있다.', 'scale_7', '1,2,3,4,5,6,7', true),
  ((SELECT id FROM survey_sets WHERE name = '업무몰입도 설문'), 'engage_comment', '의견', '업무 환경 개선을 위한 제안이 있다면 자유롭게 작성해 주세요.', 'text', NULL, false);
