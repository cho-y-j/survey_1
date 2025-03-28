# 설문 조사 시스템


이 프로젝트는 Next.js와 Supabase를 활용한 설문 조사 시스템입니다. 다양한 설문셋을 관리하고, 복수 설문셋을 조합해 회사별로 배포하며, 설문 결과를 분석 및 시각화할 수 있습니다.

## 프로젝트 구조


src/
├── components/ # 재사용 가능한 컴포넌트
│ ├── admin/ # 관리자 페이지 컴포넌트
│ ├── charts/ # 차트 관련 컴포넌트
│ ├── common/ # 공통 컴포넌트
│ ├── layout/ # 레이아웃 컴포넌트
│ └── results/ # 결과 분석 컴포넌트
├── pages/ # 페이지 컴포넌트
│ ├── admin/ # 관리자 페이지
│ ├── api/ # API 라우트
│ │ ├── results/ # 결과 분석 관련 API
│ │ ├── surveys/ # 설문셋 관련 API
│ │ └── survey/ # 설문 참여 관련 API
│ ├── results/ # 결과 분석 페이지
│ └── survey/ # 설문 참여 페이지
├── utils/ # 유틸리티 함수
└── styles/ # 스타일 파일

## 주요 기능

### 1. 회사 관리
- 회사 목록 조회, 추가, 수정, 삭제 기능
- 엑셀 파일을 통한 회사 데이터 일괄 업로드

### 2. 설문셋 관리
- 설문셋 목록 조회, 추가, 수정, 삭제 기능
- 설문셋 내 문항 관리 (추가, 수정, 삭제)
- 다양한 문항 유형 지원 (단일 선택, 다중 선택, 척도, 텍스트 응답 등)
- 문항 카테고리 지정 기능

### 3. 설문 배포
- 회사와 설문셋 선택하여 설문 배포
- 참여자 수 및 기간 설정
- 설문 링크 생성 및 공유
- 설문 미리보기 기능

### 4. 설문 참여 페이지
- 생성된 링크를 통한 설문 참여
- 다중 설문셋 순차적 응답 지원
- 필수 응답 문항 체크
- 설문 진행률 표시

### 5. 결과 분석
- 설문 배포별 요약 정보
- 설문 참여자 및 응답 통계
- 응답 데이터 다운로드 및 업로드 기능
- 다양한 분석 뷰 제공:
  - 문항별 분석: 각 문항에 대한 응답 통계 및 시각화
  - 카테고리별 분석: 문항 카테고리별 통계 및 시각화
  - 인구통계학적 분석: 인구통계학적 설문에 대한 분석 및 시각화
  - 상관관계 분석: 인구통계학적 특성과 다른 응답 간의 상관관계 분석

### 6. 컴포넌트 기반 구조
- 재사용 가능한 컴포넌트 단위로 구성
- 분석 기능을 위한 전문 컴포넌트 제공:
  - `CategoryAnalysis`: 카테고리별 분석 시각화
  - `ItemAnalysis`: 문항별 응답 분석 
  - `DemographicAnalysis`: 인구통계학적 분석
  - `CorrelationAnalysis`: 상관관계 분석

## 기술 스택

- **Next.js**: 프론트엔드 UI, API Routes
- **Supabase**: 데이터베이스, 인증, 벡터 검색(pgvector)
- **OpenAI API**: 문항 생성, 임베딩 생성, RAG 답변 생성
- **Recharts**: 설문 결과 시각화
- **Material-UI**: 사용자 인터페이스 컴포넌트

## API 엔드포인트

### 설문 배포
- `POST /api/distribute`: 설문 배포 및 고유 링크 생성
  - 기능: 설문셋을 선택하여 특정 회사에 배포하고 고유 액세스 토큰 생성
  - 요청 본문: `{company_id, title, survey_set_ids, target_participants, start_date, end_date}`
  - 응답: 생성된 배포 정보와 액세스 URL

### 설문 참여
- `GET /api/survey/[token]`: 설문 데이터 조회
  - 기능: 특정 토큰에 해당하는 설문 배포 및 문항 정보 반환
  - 응답: 설문 제목, 설명, 문항 목록 등 

- `POST /api/responses`: 설문 응답 저장
  - 기능: 참여자의 설문 응답 데이터 저장
  - 요청 본문: `{survey_distribution_id, responses: [{question_id, answer, user_id}]}`
  - 응답: 저장된 응답 개수 및 상태

### 결과 분석
- `GET /api/results/[distributionId]`: 특정 배포에 대한 결과 분석 데이터 조회
  - 기능: 설문 배포에 대한 요약 통계 및 기본 분석 데이터 제공
  - 쿼리 파라미터: 없음
  - 응답: 참여자 수, 완료율, 문항별 요약 통계 등

- `GET /api/results/[distributionId]/items`: 문항별 상세 분석 데이터 조회
  - 기능: 특정 설문셋의 모든 문항에 대한 상세 응답 통계 제공
  - 쿼리 파라미터: `surveySetId` (필수) - 분석할 설문셋 ID
  - 응답: 문항별 응답 수, 평균값(척도 문항), 응답 빈도(선택형 문항) 등 포함
  - 최적화: `analysis_cache` 테이블을 활용한 30분 단위 캐싱으로 성능 향상
  - 데이터베이스 함수: `get_item_response_stats` 활용

- `GET /api/results/[distributionId]/categories`: 카테고리별 분석 데이터 조회
  - 기능: 문항을 카테고리별로 그룹화하여 분석 데이터 제공
  - 쿼리 파라미터: `surveySetId` (필수) - 분석할 설문셋 ID
  - 응답: 카테고리별 문항 수, 평균 점수, 카테고리 내 문항 통계 등
  - 최적화: `analysis_cache` 테이블 활용 및 `get_category_stats` 데이터베이스 함수 사용

- `GET /api/results/download/[distributionId]`: 결과 데이터 다운로드
  - 기능: 설문 응답 데이터를 CSV 또는 JSON 형식으로 다운로드
  - 쿼리 파라미터: `format` (선택, 기본값 'csv') - 'csv' 또는 'json'
  - 응답: 파일 다운로드 스트림

- `GET /api/results/template/[distributionId]`: 업로드용 템플릿 다운로드
  - 기능: 설문 응답 데이터 업로드를 위한 템플릿 파일 제공
  - 쿼리 파라미터: 없음
  - 응답: CSV 템플릿 파일 다운로드

- `POST /api/results/upload/[distributionId]`: 결과 데이터 업로드
  - 기능: CSV 형식의 응답 데이터 업로드 및 일괄 처리
  - 요청: multipart/form-data 형식으로 CSV 파일 전송
  - 응답: 업로드 요약 (처리된 행 수, 성공, 실패 등)

## 성능 최적화

### 데이터베이스 최적화

프로젝트는 대량의 설문 응답 데이터(수천 개)를 효율적으로 처리하기 위해 다음과 같은 데이터베이스 최적화를 적용했습니다:

#### 1. 최적화된 분석 함수

다음과 같은 서버 측 함수를 구현하여 데이터 분석 성능을 향상시켰습니다:

- `get_item_response_stats`: 문항별 응답 통계를 효율적으로 계산
  - 입력: 배포 ID, 설문셋 ID
  - 출력: 문항별 응답 수, 평균값, 빈도 등의 분석 데이터
  - 특징: 한 번의 쿼리로 모든 문항의 통계 데이터 계산

- `get_category_stats`: 카테고리별 응답 통계를 효율적으로 계산
  - 입력: 배포 ID, 설문셋 ID
  - 출력: 카테고리별 통계 및 포함된 문항 데이터
  - 특징: 문항을 카테고리별로 그룹화하여 처리

- `update_analysis_cache`: 분석 결과의 캐싱 처리
  - 입력: 배포 ID, 설문셋 ID, 캐시 유형, 캐시 데이터
  - 출력: 캐시 ID
  - 특징: 기존 캐시를 확인하여 업데이트 또는 새로 생성

#### 2. 분석 결과 캐싱

분석 결과를 `analysis_cache` 테이블에 저장하여 반복적인 계산을 방지합니다:
- 분석 데이터의 시간적 일관성 유지 (30분 단위 캐시 갱신)
- 사용자 응답 속도 개선
- 서버 부하 감소

#### 3. 인덱스 최적화

다음과 같은 인덱스를 추가하여 쿼리 성능을 향상시켰습니다:
- `idx_responses_survey_distribution_id`: 배포별 응답 조회 속도 개선
- `idx_responses_user_id`: 사용자별 응답 조회 속도 개선
- `idx_analysis_cache_lookup`: 캐시 조회 속도 개선

### API 최적화

결과 분석을 위한 API는 다음과 같은 최적화 전략을 적용했습니다:

1. **점진적 데이터 로딩**: 필요한 데이터만 단계적으로 로드
2. **서버 측 집계**: 데이터 집계 작업을 클라이언트가 아닌 서버에서 처리
3. **캐시 메커니즘**: 분석 결과를 캐시하여 반복 요청 시 즉시 응답
4. **설문셋 필터링**: 전체 데이터가 아닌 선택된 설문셋 데이터만 조회

### 프론트엔드 최적화

1. **지연 로딩**: 필요한 컴포넌트만 초기에 로드
2. **메모이제이션**: `useMemo`와 `useCallback`을 활용한 불필요한 재계산 방지
3. **가상화**: 대량의 목록 데이터 처리 시 가상화 기법 적용

## 페이지 구조

### 메인 페이지
- `/`: 시스템 개요 및 Supabase 연결 상태 확인

### 관리자 페이지
- `/admin/companies`: 회사 관리
- `/admin/surveys`: 설문셋 관리
- `/admin/surveys/[id]/questions`: 문항 관리
- `/admin/distribute`: 설문 배포
- `/admin/results`: 배포 결과 관리

### 설문 참여 페이지
- `/survey/[token]`: 설문 참여자가 고유 링크를 통해 접속하여 설문에 응답

### 결과 분석 페이지
- `/results`: 전체 설문 결과 대시보드 (요약 통계 및 최근 배포 목록)
- `/results/[distributionId]`: 특정 설문 배포의 결과 분석 및 시각화
- `/results/[distributionId]/items`: 문항별 응답 분석 및 시각화
  - 기능: 모든 문항에 대한 개별 응답 통계 및 차트
  - 필터링: 설문셋 선택을 통한 문항 필터링
  - 데이터 소스: `/api/results/[distributionId]/items` API 호출
- `/results/[distributionId]/categories`: 카테고리별 그룹화 분석 및 시각화
- `/results/[distributionId]/demographics`: 인구통계학적 분석 
- `/results/[distributionId]/correlations`: 상관관계 분석

## 데이터베이스 함수 사용 예시

### 문항별 분석 데이터 조회

```javascript
// 문항별 응답 통계 조회
const { data, error } = await supabase
  .rpc('get_item_response_stats', {
    dist_id: distributionId,
    survey_set_id: selectedSurveySetId
  });

if (error) console.error('분석 데이터 조회 오류:', error);
else {
  // 데이터 처리 및 시각화
  console.log(`${data.length}개 문항에 대한 통계 데이터 로드 완료`);
}
```

## 설치 및 실행 방법

1. 저장소 클론
```bash
git clone <repository-url>
cd survey-system
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.local` 파일을 생성하고 Supabase 연결 정보를 추가합니다.

4. 개발 서버 실행
```bash
npm run dev
```

## 추가 개발 사항

1. **인증 시스템 개선**: Supabase Auth를 활용한 세분화된 권한 관리
2. **다국어 지원**: i18n을 활용한 다국어 지원
3. **고급 분석 기능**: 머신러닝을 활용한 추천 및 예측 기능


3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 추가합니다:
```
NEXT_PUBLIC_SUPABASE_URL=https://izusbdhybfmpchibgryx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dXNiZGh5YmZtcGNoaWJncnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMjU3MDcsImV4cCI6MjA1NjgwMTcwN30.LNNdxhLCbnzwXE3yeXnG4TUcVno42kAIWHApj5pSCiw
OPENAI_API_KEY=your-openai-api-key
```



Supabase 프로젝트에서  수행

1. SQL 에디터에서 `database/schema.sql` 파일의 내용을 실행하여 필요한 테이블과 함수를 생성
2. 샘플 데이터를 추가 `database/sample_data.sql` 파일의 내용을 실행



## API 엔드포인트

### 설문 배포
- `POST /api/distribute`: 설문 배포 및 고유 링크 생성

### 설문 참여
- `GET /api/survey/[token]`: 설문 데이터 조회
- `POST /api/responses`: 설문 응답 저장

### 결과 분석
- `GET /api/results/[distributionId]`: 설문 결과 분석 데이터 조회
- `GET /api/results/download/[distributionId]`: 결과 다운로드 (CSV/JSON)
- `GET /api/results/template/[distributionId]`: 업로드용 템플릿 다운로드
- `POST /api/results/upload/[distributionId]`: 결과 데이터 업로드

## 페이지 설명

### 메인 페이지
- `/`: 시스템 개요 및 Supabase 연결 상태 확인

### 관리자 페이지
- `/admin/companies`: 회사 관리
- `/admin/surveys`: 설문셋 관리
- `/admin/surveys/[id]/questions`: 문항 관리
- `/admin/distribute`: 설문 배포

### 설문 참여 페이지
- `/survey/[token]`: 설문 참여자가 고유 링크를 통해 접속하여 설문에 응답

### 결과 분석 페이지
- `/results/[distributionId]`: 설문 결과 분석 및 시각화, 다운로드/업로드 기능 제공
- `/results/[distributionId]/items`: 문항별 응답 분석 및 시각화
- `/results/[distributionId]/categories`: 카테고리별 그룹화 분석 및 시각화

## 상세 기능 설명

### 카테고리별 분석 기능
카테고리별 분석 페이지(`/results/[distributionId]/categories`)는 다음과 같은 기능을 제공합니다:

#### 카테고리 기반 통계
- 설문 문항의 카테고리를 기준으로 그룹화하여 분석
- 각 카테고리별 문항 수, 총 응답 수, 척도 문항 수 통계 제공
- 탭 인터페이스를 통해 카테고리 간 쉬운 전환

#### 시각화 기능
- **막대 차트**: 카테고리 내 척도 문항의 평균 점수 시각화
- **레이더 차트**: 카테고리 내 문항들의 평균 점수 비교 (최대 8개 문항)
- 카테고리 내 문항 목록 및 통계 정보 표시

#### 데이터 필터링
- 설문셋 선택을 통한 데이터 필터링
- URL 파라미터를 통한 초기 설문셋 선택 지원

#### 사용자 인터페이스
- 직관적인 통계 정보 표시
- 카테고리가 없는 경우 안내 메시지 제공
- 반응형 디자인으로 다양한 화면 크기 지원
- 분석 페이지 간 손쉬운 이동 (결과 요약, 문항별 분석 페이지로 이동 버튼)

## 추가 개발 사항

이 프로젝트는 기본적인 기능만 구현되어 있으며, 다음과 같은 기능을 추가로 개발할 수 있습니다:

survey-system/
├── src/
│ ├── components/ # 재사용 가능한 컴포넌트
│ │ ├── layout/ # 레이아웃 컴포넌트
│ │ ├── survey/ # 설문 관련 컴포넌트
│ │ ├── admin/ # 관리자 페이지 컴포넌트
│ │ ├── results/ # 결과 분석 컴포넌트
│ │ └── common/ # 공통 UI 컴포넌트
│ ├── pages/ # 페이지 컴포넌트
│ │ ├── api/ # API 라우트
│ │ ├── admin/ # 관리자 페이지
│ │ ├── survey/ # 설문 참여 페이지
│ │ └── results/ # 결과 분석 페이지
│ ├── utils/ # 유틸리티 함수
│ ├── hooks/ # 커스텀 훅
│ ├── contexts/ # Context API
│ └── styles/ # 스타일 파일
├── database/ # 데이터베이스 스키마 및 샘플 데이터
├── public/ # 정적 파일
└── .env.local # 환경 변수

상세 구조
src/
├── components/         # 재사용 컴포넌트
│   ├── layout/         # 레이아웃 컴포넌트
│   │   ├── AdminLayout.js
│   │   ├── MainLayout.js
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   └── Footer.js
│   ├── survey/         # 설문 관련 컴포넌트
│   │   ├── QuestionItem.js
│   │   ├── QuestionTypeSelector.js
│   │   ├── SingleChoiceInput.js
│   │   ├── MultipleChoiceInput.js
│   │   ├── ScaleInput.js
│   │   └── TextInput.js
│   ├── admin/          # 관리자 페이지 컴포넌트
│   │   ├── CompanyTable.js
│   │   ├── SurveySetTable.js
│   │   ├── QuestionTable.js
│   │   ├── DistributionForm.js
│   │   └── DistributionTable.js
│   ├── results/        # 결과 분석 컴포넌트
│   │   ├── AnalysisTabs.js
│   │   ├── FilterPanel.js
│   │   ├── ItemAnalysis.js
│   │   ├── CategoryAnalysis.js
│   │   ├── DemographicAnalysis.js
│   │   ├── CorrelationAnalysis.js
│   │   └── charts/
│   │       ├── BarChart.js
│   │       ├── PieChart.js
│   │       ├── LineChart.js
│   │       ├── ScatterChart.js
│   │       └── HeatmapChart.js
│   └── common/         # 공통 UI 컴포넌트
│       ├── LoadingSpinner.js
│       ├── ErrorAlert.js
│       ├── ConfirmDialog.js
│       ├── DownloadButton.js
│       └── UploadField.js
├── utils/              # 유틸리티 함수
│   ├── supabase.js     # Supabase 연결
│   ├── auth.js         # 인증 관련 함수
│   ├── analytics.js    # 데이터 분석 함수
│   ├── formatters.js   # 데이터 포맷팅
│   └── openai.js       # OpenAI 연동
├── hooks/              # 커스텀 훅
│   ├── useAuth.js      # 인증 관련 훅
│   ├── useSurvey.js    # 설문 데이터 관련 훅
│   └── useResults.js   # 결과 분석 관련 훅
├── contexts/           # Context API
│   ├── AuthContext.js  # 인증 컨텍스트
│   └── ResultsContext.js # 결과 분석 컨텍스트
├── styles/
│   ├── globals.css     # 전역 스타일
│   └── theme.js        # Material-UI 테마
├── pages/              # 페이지 컴포넌트
│   ├── admin/          # 관리자 페이지
│   │   ├── companies.js          # 회사 관리
│   │   ├── surveys/              # 설문셋 관리
│   │   │   ├── index.js          # 설문셋 목록
│   │   │   └── [id]/
│   │   │       └── questions.js  # 문항 관리
│   │   └── distribute.js         # 설문 배포
│   ├── api/            # API 라우트 (현재 구조 유지)
│   ├── survey/
│   │   └── [token].js  # 설문 참여 페이지
│   ├── results/        # 결과 페이지 구조화
│   │   └── dist/
│   │       ├── items.js           # 문항별 분석
│   │       ├── categories.js      # 카테고리별 교차 분석
│   │       ├── demographics.js    # 인구통계학적 교차 분석
│   │       └── correlations.js    # 상관관계 분석
│   │   └── index.js           # 메인 결과 페이지
│   └── index.js        # 메인 페이지

## API 엔드포인트

### 설문 배포
- `POST /api/distribute`: 설문 배포 및 고유 링크 생성

### 설문 참여
- `GET /api/survey/[token]`: 설문 데이터 조회
- `POST /api/responses`: 설문 응답 저장

### 결과 분석
- `GET /api/results/[distributionId]`: 설문 결과 분석 데이터 조회
- `GET /api/results/download/[distributionId]`: 결과 다운로드 (CSV/JSON)
- `GET /api/results/template/[distributionId]`: 업로드용 템플릿 다운로드
- `POST /api/results/upload/[distributionId]`: 결과 데이터 업로드

## 페이지 설명

### 메인 페이지
- `/`: 시스템 개요 및 Supabase 연결 상태 확인

### 관리자 페이지
- `/admin/companies`: 회사 관리
- `/admin/surveys`: 설문셋 관리
- `/admin/surveys/[id]/questions`: 문항 관리
- `/admin/distribute`: 설문 배포

### 설문 참여 페이지
- `/survey/[token]`: 설문 참여자가 고유 링크를 통해 접속하여 설문에 응답

### 결과 분석 페이지
- `/results/[distributionId]`: 설문 결과 분석 및 시각화
- `/results/[distributionId]/items`: 문항별 분석
- `/results/[distributionId]/categories`: 카테고리별 분석
- `/results/[distributionId]/demographics`: 인구통계학적 분석
- `/results/[distributionId]/correlations`: 상관관계 분석

## Material-UI 활용

이 프로젝트는 Material-UI를 활용하여 일관된 디자인 시스템을 적용하였습니다:

1. **테마 설정**: `src/styles/theme.js`에서 프로젝트 전체 디자인 테마를 관리합니다.
2. **재사용 컴포넌트**: Material-UI 컴포넌트를 기반으로 커스텀 컴포넌트를 개발하여 일관된 UI를 제공합니다.
3. **반응형 디자인**: Material-UI의 Grid 시스템을 활용하여 다양한 화면 크기에 대응합니다.

## 성능 최적화

### 데이터베이스 최적화

프로젝트는 대량의 설문 응답 데이터(수천 개)를 효율적으로 처리하기 위해 다음과 같은 데이터베이스 최적화를 적용했습니다:

#### 1. 최적화된 분석 함수

다음과 같은 서버 측 함수를 구현하여 데이터 분석 성능을 향상시켰습니다:

- `get_item_response_stats`: 문항별 응답 통계를 효율적으로 계산
- `get_category_stats`: 카테고리별 응답 통계를 효율적으로 계산
- `update_analysis_cache`: 분석 결과의 캐싱 처리

#### 2. 분석 결과 캐싱

분석 결과를 `analysis_cache` 테이블에 저장하여 반복적인 계산을 방지합니다:
- 분석 데이터의 시간적 일관성 유지
- 사용자 응답 속도 개선
- 서버 부하 감소

#### 3. 인덱스 최적화

다음과 같은 인덱스를 추가하여 쿼리 성능을 향상시켰습니다:
- `idx_responses_survey_distribution_id`: 배포별 응답 조회 속도 개선
- `idx_responses_user_id`: 사용자별 응답 조회 속도 개선
- `idx_analysis_cache_lookup`: 캐시 조회 속도 개선

### API 최적화

결과 분석을 위한 API는 다음과 같은 최적화 전략을 적용했습니다:

1. **점진적 데이터 로딩**: 필요한 데이터만 단계적으로 로드
2. **서버 측 집계**: 데이터 집계 작업을 클라이언트가 아닌 서버에서 처리
3. **캐시 메커니즘**: 분석 결과를 캐시하여 반복 요청 시 즉시 응답
4. **설문셋 필터링**: 전체 데이터가 아닌 선택된 설문셋 데이터만 조회

### 프론트엔드 최적화

1. **지연 로딩**: 필요한 컴포넌트만 초기에 로드
2. **메모이제이션**: `useMemo`와 `useCallback`을 활용한 불필요한 재계산 방지
3. **가상화**: 대량의 목록 데이터 처리 시 가상화 기법 적용

## 데이터베이스 함수 사용 예시

### 문항별 분석 데이터 조회

```javascript
// 문항별 응답 통계 조회
const { data, error } = await supabase
  .rpc('get_item_response_stats', {
    dist_id: distributionId,
    survey_set_id: selectedSurveySetId
  });

if (error) console.error('분석 데이터 조회 오류:', error);
else {
  // 데이터 처리 및 시각화
  console.log(`${data.length}개 문항에 대한 통계 데이터 로드 완료`);
}
```

### 카테고리별 분석 데이터 조회

```javascript
// 카테고리별 응답 통계 조회
const { data, error } = await supabase
  .rpc('get_category_stats', {
    dist_id: distributionId,
    survey_set_id: selectedSurveySetId
  });

if (error) console.error('카테고리 데이터 조회 오류:', error);
else {
  // 카테고리별 데이터 처리 및 시각화
  console.log(`${data.length}개 카테고리에 대한 통계 데이터 로드 완료`);
}
```

### 캐시 활용 예시

```javascript
// 캐시 데이터 확인
const { data: cacheData, error: cacheError } = await supabase
  .from('analysis_cache')
  .select('cache_data, updated_at')
  .eq('survey_distribution_id', distributionId)
  .eq('survey_set_id', surveySetId)
  .eq('cache_type', 'item_analysis')
  .order('updated_at', { ascending: false })
  .limit(1);

// 캐시가 있고 최신 상태면 사용
if (cacheData && cacheData.length > 0) {
  const cachedAt = new Date(cacheData[0].updated_at);
  const now = new Date();
  const diffMinutes = (now - cachedAt) / (1000 * 60);
  
  if (diffMinutes < 30) { // 30분 이내 캐시만 사용
    return cacheData[0].cache_data;
  }
}

// 캐시가 없거나 오래된 경우 새로 조회하고 캐시 업데이트
const { data, error } = await supabase
  .rpc('get_item_response_stats', { 
    dist_id: distributionId,
    survey_set_id: surveySetId 
  });

// 캐시 업데이트
await supabase.rpc('update_analysis_cache', {
  dist_id: distributionId,
  set_id: surveySetId,
  c_type: 'item_analysis',
  c_data: { items: data }
});
```
```


## 주요 기능

### 1. 회사 관리
- 회사 목록 조회, 추가, 수정, 삭제 기능
- 엑셀 파일을 통한 회사 데이터 일괄 업로드

### 2. 설문셋 관리
- 설문셋 목록 조회, 추가, 수정, 삭제 기능
- 설문셋 내 문항 관리 (추가, 수정, 삭제)
- 다양한 문항 유형 지원 (단일 선택, 다중 선택, 척도, 텍스트 응답 등)
- 문항 카테고리 지정 기능

### 3. 설문 배포
- 회사와 설문셋 선택하여 설문 배포
- 참여자 수 및 기간 설정
- 설문 링크 생성 및 공유
- 설문 미리보기 기능

### 4. 설문 참여 페이지
- 생성된 링크를 통한 설문 참여
- 다중 설문셋 순차적 응답 지원
- 필수 응답 문항 체크
- 설문 진행률 표시

### 5. 결과 분석
- 설문 배포별 요약 정보
- 설문 참여자 및 응답 통계
- 응답 데이터 다운로드 및 업로드 기능
- 다양한 분석 뷰 제공:
  - 문항별 분석: 각 문항에 대한 응답 통계 및 시각화
  - 카테고리별 분석: 문항 카테고리별 통계 및 시각화
  - 인구통계학적 분석: 인구통계학적 설문에 대한 분석 및 시각화
  - 상관관계 분석: 인구통계학적 특성과 다른 응답 간의 상관관계 분석

### 6. 컴포넌트 기반 구조
- 재사용 가능한 컴포넌트 단위로 구성
- 분석 기능을 위한 전문 컴포넌트 제공:
  - `CategoryAnalysis`: 카테고리별 분석 시각화
  - `ItemAnalysis`: 문항별 응답 분석 
  - `DemographicAnalysis`: 인구통계학적 분석
  - `CorrelationAnalysis`: 상관관계 분석

## 기술 스택

- **Next.js**: 프론트엔드 UI, API Routes
- **Supabase**: 데이터베이스, 인증, 벡터 검색(pgvector)
- **OpenAI API**: 문항 생성, 임베딩 생성, RAG 답변 생성
- **Recharts**: 설문 결과 시각화
- **Material-UI**: 사용자 인터페이스 컴포넌트

## API 엔드포인트

### 설문 배포
- `POST /api/distribute`: 설문 배포 및 고유 링크 생성
  - 기능: 설문셋을 선택하여 특정 회사에 배포하고 고유 액세스 토큰 생성
  - 요청 본문: `{company_id, title, survey_set_ids, target_participants, start_date, end_date}`
  - 응답: 생성된 배포 정보와 액세스 URL

### 설문 참여
- `GET /api/survey/[token]`: 설문 데이터 조회
  - 기능: 특정 토큰에 해당하는 설문 배포 및 문항 정보 반환
  - 응답: 설문 제목, 설명, 문항 목록 등 

- `POST /api/responses`: 설문 응답 저장
  - 기능: 참여자의 설문 응답 데이터 저장
  - 요청 본문: `{survey_distribution_id, responses: [{question_id, answer, user_id}]}`
  - 응답: 저장된 응답 개수 및 상태

### 결과 분석
- `GET /api/results/[distributionId]`: 특정 배포에 대한 결과 분석 데이터 조회
  - 기능: 설문 배포에 대한 요약 통계 및 기본 분석 데이터 제공
  - 쿼리 파라미터: 없음
  - 응답: 참여자 수, 완료율, 문항별 요약 통계 등

- `GET /api/results/[distributionId]/items`: 문항별 상세 분석 데이터 조회
  - 기능: 특정 설문셋의 모든 문항에 대한 상세 응답 통계 제공
  - 쿼리 파라미터: `surveySetId` (필수) - 분석할 설문셋 ID
  - 응답: 문항별 응답 수, 평균값(척도 문항), 응답 빈도(선택형 문항) 등 포함
  - 최적화: `analysis_cache` 테이블을 활용한 30분 단위 캐싱으로 성능 향상
  - 데이터베이스 함수: `get_item_response_stats` 활용

- `GET /api/results/[distributionId]/categories`: 카테고리별 분석 데이터 조회
  - 기능: 문항을 카테고리별로 그룹화하여 분석 데이터 제공
  - 쿼리 파라미터: `surveySetId` (필수) - 분석할 설문셋 ID
  - 응답: 카테고리별 문항 수, 평균 점수, 카테고리 내 문항 통계 등
  - 최적화: `analysis_cache` 테이블 활용 및 `get_category_stats` 데이터베이스 함수 사용

- `GET /api/results/download/[distributionId]`: 결과 데이터 다운로드
  - 기능: 설문 응답 데이터를 CSV 또는 JSON 형식으로 다운로드
  - 쿼리 파라미터: `format` (선택, 기본값 'csv') - 'csv' 또는 'json'
  - 응답: 파일 다운로드 스트림

- `GET /api/results/template/[distributionId]`: 업로드용 템플릿 다운로드
  - 기능: 설문 응답 데이터 업로드를 위한 템플릿 파일 제공
  - 쿼리 파라미터: 없음
  - 응답: CSV 템플릿 파일 다운로드

- `POST /api/results/upload/[distributionId]`: 결과 데이터 업로드
  - 기능: CSV 형식의 응답 데이터 업로드 및 일괄 처리
  - 요청: multipart/form-data 형식으로 CSV 파일 전송
  - 응답: 업로드 요약 (처리된 행 수, 성공, 실패 등)

## 성능 최적화

### 데이터베이스 최적화

프로젝트는 대량의 설문 응답 데이터(수천 개)를 효율적으로 처리하기 위해 다음과 같은 데이터베이스 최적화를 적용했습니다:

#### 1. 최적화된 분석 함수

다음과 같은 서버 측 함수를 구현하여 데이터 분석 성능을 향상시켰습니다:

- `get_item_response_stats`: 문항별 응답 통계를 효율적으로 계산
  - 입력: 배포 ID, 설문셋 ID
  - 출력: 문항별 응답 수, 평균값, 빈도 등의 분석 데이터
  - 특징: 한 번의 쿼리로 모든 문항의 통계 데이터 계산

- `get_category_stats`: 카테고리별 응답 통계를 효율적으로 계산
  - 입력: 배포 ID, 설문셋 ID
  - 출력: 카테고리별 통계 및 포함된 문항 데이터
  - 특징: 문항을 카테고리별로 그룹화하여 처리

- `update_analysis_cache`: 분석 결과의 캐싱 처리
  - 입력: 배포 ID, 설문셋 ID, 캐시 유형, 캐시 데이터
  - 출력: 캐시 ID
  - 특징: 기존 캐시를 확인하여 업데이트 또는 새로 생성

#### 2. 분석 결과 캐싱

분석 결과를 `analysis_cache` 테이블에 저장하여 반복적인 계산을 방지합니다:
- 분석 데이터의 시간적 일관성 유지 (30분 단위 캐시 갱신)
- 사용자 응답 속도 개선
- 서버 부하 감소

#### 3. 인덱스 최적화

다음과 같은 인덱스를 추가하여 쿼리 성능을 향상시켰습니다:
- `idx_responses_survey_distribution_id`: 배포별 응답 조회 속도 개선
- `idx_responses_user_id`: 사용자별 응답 조회 속도 개선
- `idx_analysis_cache_lookup`: 캐시 조회 속도 개선

### API 최적화

결과 분석을 위한 API는 다음과 같은 최적화 전략을 적용했습니다:

1. **점진적 데이터 로딩**: 필요한 데이터만 단계적으로 로드
2. **서버 측 집계**: 데이터 집계 작업을 클라이언트가 아닌 서버에서 처리
3. **캐시 메커니즘**: 분석 결과를 캐시하여 반복 요청 시 즉시 응답
4. **설문셋 필터링**: 전체 데이터가 아닌 선택된 설문셋 데이터만 조회

### 프론트엔드 최적화

1. **지연 로딩**: 필요한 컴포넌트만 초기에 로드
2. **메모이제이션**: `useMemo`와 `useCallback`을 활용한 불필요한 재계산 방지
3. **가상화**: 대량의 목록 데이터 처리 시 가상화 기법 적용

## 페이지 구조

### 메인 페이지
- `/`: 시스템 개요 및 Supabase 연결 상태 확인

### 관리자 페이지
- `/admin/companies`: 회사 관리
- `/admin/surveys`: 설문셋 관리
- `/admin/surveys/[id]/questions`: 문항 관리
- `/admin/distribute`: 설문 배포
- `/admin/results`: 배포 결과 관리

### 설문 참여 페이지
- `/survey/[token]`: 설문 참여자가 고유 링크를 통해 접속하여 설문에 응답

### 결과 분석 페이지
- `/results`: 전체 설문 결과 대시보드 (요약 통계 및 최근 배포 목록)
- `/results/[distributionId]`: 특정 설문 배포의 결과 분석 및 시각화
- `/results/[distributionId]/items`: 문항별 응답 분석 및 시각화
  - 기능: 모든 문항에 대한 개별 응답 통계 및 차트
  - 필터링: 설문셋 선택을 통한 문항 필터링
  - 데이터 소스: `/api/results/[distributionId]/items` API 호출
- `/results/[distributionId]/categories`: 카테고리별 그룹화 분석 및 시각화
- `/results/[distributionId]/demographics`: 인구통계학적 분석 
- `/results/[distributionId]/correlations`: 상관관계 분석

## 데이터베이스 함수 사용 예시

### 문항별 분석 데이터 조회

```javascript
// 문항별 응답 통계 조회
const { data, error } = await supabase
  .rpc('get_item_response_stats', {
    dist_id: distributionId,
    survey_set_id: selectedSurveySetId
  });

if (error) console.error('분석 데이터 조회 오류:', error);
else {
  // 데이터 처리 및 시각화
  console.log(`${data.length}개 문항에 대한 통계 데이터 로드 완료`);
}
```

## 설치 및 실행 방법

1. 저장소 클론
```bash
git clone <repository-url>
cd survey-system
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.local` 파일을 생성하고 Supabase 연결 정보를 추가합니다.

4. 개발 서버 실행
```bash
npm run dev
```

## 추가 개발 사항

1. **인증 시스템 개선**: Supabase Auth를 활용한 세분화된 권한 관리
2. **다국어 지원**: i18n을 활용한 다국어 지원
3. **고급 분석 기능**: 머신러닝을 활용한 추천 및 예측 기능