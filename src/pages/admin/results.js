import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';

// 전역 함수로 정의하여 어디서든 접근 가능하게 함
function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function AdminResultsPage() {
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDistributions();
  }, []);

  const fetchDistributions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('survey_distributions')
        .select(`
          *,
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDistributions(data);
    } catch (error) {
      console.error('Error fetching distributions:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceComplete = async (distributionId) => {
    try {
      const { error } = await supabase
        .from('survey_distributions')
        .update({ status: 'completed' })
        .eq('id', distributionId);

      if (error) throw error;
      fetchDistributions();
    } catch (error) {
      console.error('Error forcing completion:', error);
      alert('강제 완료 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDownloadTemplate = async (distribution) => {
    try {
      // 설문셋 ID 목록 가져오기
      let surveySetIds;
      
      // 데이터 형식 로깅 (디버깅 용도)
      console.log("survey_set_ids 데이터 타입:", typeof distribution.survey_set_ids);
      console.log("survey_set_ids 원본 값:", distribution.survey_set_ids);
      
      try {
        // JSON 형식으로 저장된 경우
        if (typeof distribution.survey_set_ids === 'string' && 
            (distribution.survey_set_ids.startsWith('[') || distribution.survey_set_ids.startsWith('{'))) {
          surveySetIds = JSON.parse(distribution.survey_set_ids);
        } 
        // 쉼표로 구분된 문자열인 경우
        else if (typeof distribution.survey_set_ids === 'string' && distribution.survey_set_ids.includes(',')) {
          surveySetIds = distribution.survey_set_ids.split(',').map(id => id.trim());
        }
        // 단일 문자열 ID인 경우
        else if (typeof distribution.survey_set_ids === 'string') {
          surveySetIds = [distribution.survey_set_ids];
        }
        // 이미 배열인 경우
        else if (Array.isArray(distribution.survey_set_ids)) {
          surveySetIds = distribution.survey_set_ids;
        }
        // 기타 경우 (객체 등)
        else {
          surveySetIds = [String(distribution.survey_set_ids)];
        }
      } catch (e) {
        console.error("survey_set_ids 파싱 오류:", e);
        surveySetIds = typeof distribution.survey_set_ids === 'string' 
          ? [distribution.survey_set_ids] 
          : [String(distribution.survey_set_ids)];
      }
      
      // ID 배열이 비어있는지 확인
      if (!surveySetIds || surveySetIds.length === 0) {
        throw new Error('유효한 설문셋 ID를 찾을 수 없습니다.');
      }
      
      console.log("파싱된 설문셋 ID 목록:", surveySetIds);
      
      // 설문셋의 모든 질문 가져오기
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds)
        .order('created_at');

      if (questionsError) throw questionsError;
      
      // 기존 응답 데이터 가져오기 (페이징 처리 추가)
      let allExistingResponses = [];
      let page = 0;
      const pageSize = 1000; // 페이지당 1000개 응답
      let hasMore = true;

      while (hasMore) {
        const { data: pageResponses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
          .eq('survey_distribution_id', distribution.id)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (responsesError) throw responsesError;
      
        if (pageResponses && pageResponses.length > 0) {
          allExistingResponses = [...allExistingResponses, ...pageResponses];
          page++;
          
          // 페이지 크기보다 적은 결과가 나오면 더 이상 데이터가 없음
          if (pageResponses.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const existingResponses = allExistingResponses;
      console.log(`총 ${questions?.length || 0}개의 질문, ${existingResponses?.length || 0}개의 응답을 가져왔습니다.`);
      
      // 질문이 없는 경우 샘플 추가
      let questionsList = questions || [];
      if (questionsList.length === 0) {
        questionsList = [{
          id: 'sample-question-id',
          question_text: '샘플 질문입니다.',
          question_type: 'single_choice',
        }];
      }

      // 헤더 준비
      const headers = ['respondent_id', 'timestamp'];
      questionsList.forEach(q => headers.push(q.id));
      
      // 열 제목 준비
      const columnTitles = ['응답자ID', '타임스탬프'];
      questionsList.forEach(q => {
        const safeText = q.question_text
          .replace(/"/g, '""') // 쌍따옴표 이스케이프
          .replace(/,/g, '，'); // 쉼표를 전각 쉼표로 대체
        
        columnTitles.push(`"${safeText.substring(0, 30)}${safeText.length > 30 ? '...' : ''}"`);
      });
      
      // 기존 응답 데이터 처리
      const userResponses = {};
      const userTimestamps = {};
      
      if (existingResponses && existingResponses.length > 0) {
        // 사용자별 응답 데이터 그룹화
        existingResponses.forEach(response => {
          const userId = response.user_id;
          const questionId = response.question_id;
          const answer = response.answer;
          const timestamp = response.submitted_at;
          
          // 사용자별 응답 객체 초기화
          if (!userResponses[userId]) {
            userResponses[userId] = {};
          }
          
          // 질문별 응답 저장
          userResponses[userId][questionId] = answer;
          
          // 사용자별 타임스탬프 저장 (가장 최근 값 사용)
          if (!userTimestamps[userId] || new Date(timestamp) > new Date(userTimestamps[userId])) {
            userTimestamps[userId] = timestamp;
          }
        });
        
        // 디버깅을 위한 로그 추가
        console.log('사용자별 응답 데이터:', userResponses);
        
        // 각 응답자별 질문 응답 개수 체크
        Object.keys(userResponses).forEach(userId => {
          const responseCount = Object.keys(userResponses[userId]).length;
          console.log(`응답자 ${userId}: ${responseCount}개 질문에 응답함`);
        });
      }
      
      // 사용자 목록 추출
      const userIds = Object.keys(userResponses);
      console.log(`응답자 수: ${userIds.length}`);
      
      // CSV 행 생성
      let csvRows = [];
      
      // 추가 내용 포함 (나중에 제거 가능)
      const instructions = [
        "# 설문 결과 템플릿 - 작성 안내",
        "# 1. 응답자ID 열은 고유한 값으로 유지해야 합니다. 각 참여자마다 다른 ID를 사용하세요.",
        "# 2. 타임스탬프는 ISO 형식(YYYY-MM-DDTHH:MM:SS)으로 입력하거나 ##########를 그대로 두세요.",
        "# 3. 각 질문에 대한 응답을 해당 열에 입력하세요.",
        "# 4. 이 행들은 업로드 시 무시됩니다. (앞의 # 기호를 제거하지 마세요)",
        "#"
      ];
      
      // 기존 응답자가 있으면 실제 데이터 사용, 없으면 샘플 생성
      if (userIds.length > 0) {
        // 실제 응답 데이터 사용
        userIds.forEach(userId => {
          // 타임스탬프 처리 (ISO 형식 또는 ##########)
          const timestamp = userTimestamps[userId] 
            ? new Date(userTimestamps[userId]).toISOString()
            : '##########';
          
          let row = [userId, timestamp];
          
          // 각 질문에 대한 응답 추가
          questionsList.forEach(question => {
            const answer = userResponses[userId][question.id] || '';
            // CSV 안전한 형식으로 변환
            const safeAnswer = String(answer)
              .replace(/"/g, '""') // 쌍따옴표 이스케이프
              .replace(/,/g, '，'); // 쉼표를 전각 쉼표로 대체
              
            const formattedAnswer = safeAnswer.includes('"') || safeAnswer.includes(',') 
              ? `"${safeAnswer}"` 
              : safeAnswer;
              
            row.push(formattedAnswer);
          });
          
          csvRows.push(row.join(','));
        });
      } else {
        // 샘플 데이터 생성
        const sampleIds = Array.from(
          { length: distribution.target_participants || 5 }, 
          (_, i) => `respondent_${String(i+1).padStart(3, '0')}`
        );
        
        sampleIds.forEach(respondentId => {
          let row = [respondentId, '##########'];
          questionsList.forEach(() => row.push(''));
          csvRows.push(row.join(','));
        });
      }
      
      // CSV 데이터 생성 (설명, 헤더, 열 제목, 데이터 행)
      const csvData = [
        ...instructions,
        headers.join(','),
        columnTitles.join(','),
        ...csvRows
      ].join('\n');

      // 파일 다운로드
      downloadCSV(csvData, `survey_template_${distribution.id}.csv`);
    } catch (error) {
      console.error('Template download error:', error);
      alert('템플릿 다운로드에 실패했습니다: ' + (error.message || ''));
    }
  };

  const handleOpenUploadDialog = (distribution) => {
    setSelectedDistribution(distribution);
    setUploadDialogOpen(true);
    setUploadFile(null);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedDistribution(null);
    setUploadFile(null);
  };

  const handleFileChange = (event) => {
    setUploadFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedDistribution) return;

    setUploadLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // BOM 제거 처리 추가
          let text = e.target.result;
          if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1); // BOM 제거
          }
          
          // 줄바꿈 문자 정규화 (CRLF, CR → LF)
          text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          
          // # 으로 시작하는 주석 라인 제거
          const nonCommentLines = text.split('\n').filter(line => !line.startsWith('#'));
          
          // CSV 파싱 개선 - 더 강력한 CSV 구문 분석
          const rows = [];
          
          for (const line of nonCommentLines) {
            if (!line.trim()) continue; // 빈 줄 건너뛰기
            
            // 파싱 전 로깅 추가
            console.log('원본 CSV 라인:', line);
            
            const row = [];
            let currentValue = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                // 따옴표 안의 따옴표인 경우 ("") - 실제 따옴표로 처리
                if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
                  currentValue += '"';
                  i++; // 다음 따옴표 건너뛰기
                } else {
                  // 따옴표 상태 전환
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                // 따옴표 밖의 쉼표는 필드 구분자
                row.push(currentValue);
                currentValue = '';
              } else {
                // 일반 문자는 현재 값에 추가
                currentValue += char;
              }
            }
            
            // 마지막 필드 추가
            row.push(currentValue);
            
            // 파싱 결과 로깅
            console.log('파싱된 CSV 행:', row);
            
            rows.push(row);
          }
          
          // 행이 2개 미만이면 데이터가 부족
          if (rows.length < 2) {
            throw new Error('CSV 파일에 유효한 데이터가 부족합니다');
          }
          
          // 헤더 확인 및 로깅
          console.log("파싱된 헤더:", rows[0]);
          if (rows.length > 1) {
            console.log("파싱된 열 제목:", rows[1]);
          }
          if (rows.length > 2) {
            console.log("첫 번째 데이터 행:", rows[2]);
          }
          
          // 첫 번째 행은 질문 ID (헤더)
          const headers = rows[0];
          // 두 번째 행은 질문 텍스트 (무시)
          // 세 번째 행부터는 데이터
          const data = rows.slice(2);
          
          // respondent_id와 timestamp 위치
          const respondentIdIndex = headers.findIndex(h => h?.toLowerCase?.() === 'respondent_id');
          const timestampIndex = headers.findIndex(h => h?.toLowerCase?.() === 'timestamp');
          
          // 헤더에 respondent_id가 없으면 오류
          if (respondentIdIndex === -1) {
            throw new Error('CSV 파일에 respondent_id 열이 없습니다');
          }
          
          // UUID 검증 함수 개선
          const isValidUUID = (str) => {
            // 기본 UUID 패턴: 8-4-4-4-12 형식의 16진수
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            // UUID 부분 추출을 위한 정규식
            const uuidMatch = str?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            
            // 정확한 UUID 형식이면 그대로 반환
            if (str && uuidPattern.test(str)) {
              return true;
            }
            
            // UUID 부분이 있으면 해당 값 반환
            return uuidMatch !== null;
          };
          
          // UUID 추출 함수 개선
          const extractOrGenerateUUID = (str) => {
            const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
            const match = str?.match(uuidPattern);
            
            if (match) {
              return match[1]; // 첫 번째 일치하는 UUID 반환
            }
            
            // 전역 함수 사용
            return createUUID();
          };
          
          // 질문 ID 맵 생성 - 먼저 데이터베이스에서 질문 정보 가져오기
          const { data: dbQuestions, error: qError } = await supabase
            .from('questions')
            .select('id, question_id')
            .in('survey_set_id', parseIds(selectedDistribution.survey_set_ids));
            
          if (qError) {
            console.error("질문 데이터를 가져오는 중 오류:", qError);
            throw new Error('질문 데이터를 가져오는데 실패했습니다');
          }
          
          // question_id와 UUID ID 매핑
          const questionIdToUUID = {};
          dbQuestions.forEach(q => {
            questionIdToUUID[q.question_id] = q.id;
          });
          
          console.log('질문 ID 매핑:', questionIdToUUID);
          
          // 질문 ID 인덱스 맵 생성 - 첫 두 열(respondent_id, timestamp)을 제외한 나머지 열
          const questionIndices = {};
          for (let i = 0; i < headers.length; i++) {
            if (i !== respondentIdIndex && i !== timestampIndex) {
              const questionId = headers[i]?.trim();
              if (questionId) {
                // 데이터베이스에서 해당 question_id에 대응하는 UUID 찾기
                const uuidId = questionIdToUUID[questionId];
                if (uuidId) {
                  questionIndices[questionId] = { colIndex: i, uuidId };
                  console.log(`질문 ID 매핑 성공: ${questionId} -> ${uuidId}`);
                } else {
                  // UUID 형식이면 직접 사용, 아니면 로그만 남김
                  if (isValidUUID(questionId)) {
                    console.log(`질문 ID '${questionId}'는 UUID 형식이므로 직접 사용합니다.`);
                    questionIndices[questionId] = { colIndex: i, uuidId: questionId };
                  } else {
                    console.warn(`열 ${i}: 질문 ID '${questionId}'에 대한 UUID를 찾을 수 없음`);
                  }
                }
              }
            }
          }
          
          // 매핑된 질문 수 로깅
          console.log('처리할 질문 수:', Object.keys(questionIndices).length);
          if (Object.keys(questionIndices).length === 0) {
            console.error('매핑된 질문이 없습니다. 헤더 및 질문 ID를 확인하세요.');
            alert('매핑된 질문을 찾을 수 없습니다. CSV 파일 형식이 올바른지 확인하세요.');
            setUploadLoading(false);
            return;
          }
          
          // 응답 데이터 생성 - 가로 형태를 세로 형태로 변환
          let responses = [];
          let respondentCount = 0;
          
          for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            
            // 각 행에 대한 전체 데이터 로깅
            console.log(`행 ${rowIndex + 3} 전체 데이터:`, row);
            
            // 질문 ID와 해당 응답 매핑 로깅
            for (const [questionKey, { colIndex, uuidId }] of Object.entries(questionIndices)) {
              console.log(`질문 처리:`, {
                questionKey,
                uuidId,
                value: row[colIndex],
                rowIndex: `행 ${rowIndex + 3}`,
                isTextType: true // question_type이 text인 경우 특별 표시
              });
            }
            
            let respondentId = row[respondentIdIndex]?.trim();
            
            // respondent_id가 없거나 주석이면 건너뛰기
            if (!respondentId || respondentId.startsWith('#')) {
              console.warn(`행 ${rowIndex + 3}: 유효한 respondent_id가 없음`);
              continue;
            }
            
            // respondent_id가 UUID 형식이 아니라면 UUID로 변환
            if (!isValidUUID(respondentId)) {
              // 고유한 값 보장을 위해 행 인덱스 추가
              const originalId = respondentId;
              respondentId = extractOrGenerateUUID(respondentId);
              console.warn(`행 ${rowIndex + 3}: UUID 형식 변환 - '${originalId}'에서 '${respondentId}'로 변환됨`);
            }
            
            respondentCount++;
            let rowResponseCount = 0;
            
            // 각 질문 ID에 대해 응답 생성
            for (const [questionKey, { colIndex, uuidId }] of Object.entries(questionIndices)) {
              // 행의 길이가 충분한지 확인
              if (colIndex < row.length) {
                // 응답 값 처리 - undefined나 null도 빈 문자열로 처리
                let answer = (row[colIndex] === undefined || row[colIndex] === null) 
                  ? '' 
                  : String(row[colIndex])
                    .trim()
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                
                // 디버깅을 위한 로그 추가
                console.log(`질문 처리: questionKey=${questionKey}, uuidId=${uuidId}, answer=${answer}`);
                
                // 응답 객체 생성 전 최종 확인
                if (!uuidId) {
                  console.error(`질문 ID에 대한 UUID가 없습니다: ${questionKey}`);
                  continue;
                }
                
                // 응답 객체에 배치 ID 추가
                responses.push({
                  survey_distribution_id: selectedDistribution.id,
                  question_id: uuidId,
                  answer: answer,
                  user_id: respondentId,
                  submitted_at: new Date().toISOString()
                });
              }
            }
            
            console.log(`행 ${rowIndex + 3}: ${respondentId}에 대해 ${rowResponseCount}개 응답 추가됨`);
          }

          console.log(`총 ${respondentCount}명의 참여자, ${responses.length}개의 응답 생성됨`);
          
          // 응답 데이터 저장 전에 로깅 추가
          console.log(`응답 데이터 저장 시작: 총 ${responses.length}개 항목`);
          
          // 개발 환경에서만 더 상세한 로깅 활성화
          if (process.env.NODE_ENV === 'development') {
            console.log('DELETE 요청 전송:', {
              table: 'responses',
              filter: { survey_distribution_id: selectedDistribution.id },
              ids: responses.map(r => r.id)
            });
            
            // 기존 응답 데이터 삭제 대신 함수 호출
            const { data, error } = await supabase.rpc(
              'delete_responses_by_distribution', 
              { dist_id: selectedDistribution.id }
            );
            
            console.log('DELETE 응답:', data, error);
            
            if (error) {
              console.error("삭제 오류 세부 정보:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
            }
          }
          
          // 응답 데이터 유효성 검사 함수 추가
          const validateResponse = (response) => {
            if (!response.survey_distribution_id || !response.question_id || !response.user_id) {
              console.error('필수 필드 누락:', response);
              return false;
            }

            if (response.answer === undefined || response.answer === null) {
              response.answer = '';
            } else {
              response.answer = String(response.answer)
                .trim()
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            }

            return true;
          };

          // 응답 데이터 검증
          const validResponses = responses.filter(response => validateResponse(response));
          console.log(`총 ${responses.length}개 중 ${validResponses.length}개 유효`);

          // 청크 크기 정의 (이 부분이 누락되어 있었음)
          const chunkSize = 2; // 작은 크기로 설정
          let successCount = 0;

          // 청크별 데이터 삽입
          for (let i = 0; i < validResponses.length; i += chunkSize) {
            const chunk = validResponses.slice(i, i + chunkSize);
            try {
              // 각 청크 처리 전 잠시 대기
              await new Promise(resolve => setTimeout(resolve, 300));

              const { error } = await supabase
                .from('responses')
                .insert(chunk);
                
              if (error) {
                console.error(`청크 ${Math.floor(i/chunkSize) + 1} 저장 중 오류:`, error);
                
                // 개별 처리
                for (const response of chunk) {
                  try {
                    await new Promise(resolve => setTimeout(resolve, 100));
                  const { error: singleError } = await supabase
                    .from('responses')
                    .insert([response]);
                
                  if (!singleError) {
                    successCount++;
                  } else {
                    console.error('단일 응답 저장 오류:', singleError, response);
                  }
                } catch (e) {
                  console.error('단일 응답 처리 오류:', e);
                }
              }
            } else {
              console.log(`청크 ${Math.floor(i/chunkSize) + 1}: ${chunk.length}개 응답 저장 완료`);
              successCount += chunk.length;
            }
          } catch (e) {
            console.error(`청크 ${Math.floor(i/chunkSize) + 1} 처리 중 오류:`, e);
          }
          }

          if (successCount > 0) {
            alert(`결과가 업로드되었습니다.\n총 ${validResponses.length}개 중 ${successCount}개의 응답이 저장되었습니다.`);
            handleCloseUploadDialog();
            fetchDistributions();
          } else {
            alert('응답 저장에 실패했습니다. 관리자에게 문의하세요.');
          }

        } catch (error) {
          console.error('파일 처리 중 오류:', error);
          alert('파일 처리 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
        } finally {
          setUploadLoading(false);
        }
      };
      
      reader.onerror = (e) => {
        console.error('파일 읽기 오류:', e);
        alert('파일을 읽는 중 오류가 발생했습니다.');
        setUploadLoading(false);
      };
      
      reader.readAsText(uploadFile, 'UTF-8');
    } catch (error) {
      console.error('Upload error:', error);
      alert('결과 업로드에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
      setUploadLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '날짜 없음';
    return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  };

  // 새 함수: 임의 응답 생성 (수정)
  const generateRandomResponses = async (distribution) => {
    try {
      // 설문셋 ID 파싱
      let surveySetIds = parseIds(distribution.survey_set_ids);
      
      // 질문 가져오기
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds);
        
      if (!questions || questions.length === 0) {
        alert('질문이 없어 샘플 응답을 생성할 수 없습니다.');
        return;
      }
      
      // 생성할 참여자 수 (기본값 또는 지정값)
      const participantCount = parseInt(prompt('생성할 참여자 수를 입력하세요:', '10')) || 10;
      
      // 응답률 설정 (기본값 90%)
      const responseRate = parseInt(prompt('응답률을 입력하세요 (0-100%):', '90')) || 90;
      const responseThreshold = responseRate / 100;
      
      // 참여자 ID 배열 생성 - 이 부분이 누락되어 있음
      const participants = Array.from(
        { length: participantCount },
        () => createUUID() // 전역 함수 사용
      );
      
      // 응답 데이터 생성
      let responses = [];
      participants.forEach(participantId => {
        // 응답 시간 (최근 48시간 내 임의 시간)
        const responseTime = new Date(
          Date.now() - Math.floor(Math.random() * 48 * 60 * 60 * 1000)
        );
        
        // 각 질문에 대한 임의 응답 생성
        questions.forEach(question => {
          let answer = '';
          
          // 질문 유형에 따른 응답 생성
          switch (question.question_type) {
            case 'single_choice':
              const options = parseOptions(question.options);
              if (options.length > 0) {
                answer = options[Math.floor(Math.random() * options.length)];
              }
              break;
            case 'multiple_choice':
              const multOptions = parseOptions(question.options);
              if (multOptions.length > 0) {
                // 1~3개 항목 임의 선택
                const selectedCount = Math.floor(Math.random() * 3) + 1;
                const selectedOptions = [];
                for (let i = 0; i < selectedCount && i < multOptions.length; i++) {
                  const option = multOptions[Math.floor(Math.random() * multOptions.length)];
                  if (!selectedOptions.includes(option)) {
                    selectedOptions.push(option);
                  }
                }
                answer = selectedOptions.join(';');
              }
              break;
            case 'scale_5':
              answer = String(Math.floor(Math.random() * 5) + 1);
              break;
            case 'scale_7':
              answer = String(Math.floor(Math.random() * 7) + 1);
              break;
            case 'text':
              answer = '샘플 텍스트 응답입니다.';
              break;
            default:
              answer = '샘플 응답';
          }
          
          // 응답 객체 추가 (사용자 지정 확률로 응답)
          if (Math.random() < responseThreshold) {
            responses.push({
              survey_distribution_id: distribution.id,
              question_id: question.id,
              answer: answer,
              user_id: participantId,
              submitted_at: responseTime.toISOString()
            });
          }
        });
      });
      
      // 데이터베이스에 저장
      if (responses.length > 0) {
        // 청크 단위로 저장 - 더 작은 청크 크기 사용
        const chunkSize = 5; // 청크 크기를 5로 줄임
        let successCount = 0;
        
        for (let i = 0; i < responses.length; i += chunkSize) {
          const chunk = responses.slice(i, i + chunkSize);
          try {
          const { error } = await supabase
            .from('responses')
            .insert(chunk);
            
            if (error) {
              console.error(`청크 ${Math.floor(i/chunkSize) + 1} 저장 중 오류:`, error);
              
              // 오류 발생 시 개별 항목으로 시도
              for (const response of chunk) {
                try {
                  const { error: singleError } = await supabase
                    .from('responses')
                    .insert([response]);
                
                  if (!singleError) {
                    successCount++;
                  } else {
                    console.error('단일 응답 저장 오류:', singleError, response);
                  }
                } catch (e) {
                  console.error('단일 응답 처리 오류:', e);
                }
              }
            } else {
              console.log(`청크 ${Math.floor(i/chunkSize) + 1}: ${chunk.length}개 응답 저장 완료`);
              successCount += chunk.length;
            }
          } catch (e) {
            console.error(`청크 ${Math.floor(i/chunkSize) + 1} 처리 중 오류:`, e);
          }
          
          // 요청 간 짧은 지연 추가 (선택 사항)
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 참여자 수 업데이트
        try {
          const { error: updateError } = await supabase
          .from('survey_distributions')
          .update({ 
            current_responses: distribution.current_responses + participants.length 
          })
          .eq('id', distribution.id);
          
          if (updateError) {
            console.error("참여자 수 업데이트 오류:", updateError);
          }
        } catch (e) {
          console.error("참여자 수 업데이트 중 오류:", e);
        }
        
        alert(`${participants.length}명의 참여자에 대한 ${successCount}개의 임의 응답이 생성되었습니다.`);
        fetchDistributions(); // 목록 새로고침
      }
    } catch (error) {
      console.error('임의 응답 생성 오류:', error);
      alert('임의 응답 생성 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // parseOptions 도우미 함수
  const parseOptions = (options) => {
    if (!options) return [];
    
    if (Array.isArray(options)) {
      return options;
    }
    
    if (typeof options === 'string') {
      try {
        if (options.startsWith('[')) {
          return JSON.parse(options);
        }
        return options.split(',').map(opt => opt.trim());
      } catch (e) {
        return options.split(',').map(opt => opt.trim());
      }
    }
    
    return [String(options)];
  };

  // parseIds 함수 추가
  const parseIds = (idsData) => {
    try {
      // JSON 형식으로 저장된 경우
      if (typeof idsData === 'string' && 
          (idsData.startsWith('[') || idsData.startsWith('{'))) {
        return JSON.parse(idsData);
      } 
      // 쉼표로 구분된 문자열인 경우
      else if (typeof idsData === 'string' && idsData.includes(',')) {
        return idsData.split(',').map(id => id.trim());
      }
      // 단일 문자열 ID인 경우
      else if (typeof idsData === 'string') {
        return [idsData];
      }
      // 이미 배열인 경우
      else if (Array.isArray(idsData)) {
        return idsData;
      }
      // 기타 경우
      else {
        return [String(idsData)];
      }
    } catch (e) {
      console.error("ID 파싱 오류:", e);
      return typeof idsData === 'string' 
        ? [idsData] 
        : [String(idsData)];
    }
  };

  // 파일 다운로드 함수 완전 개선
  function downloadCSV(data, filename) {
    // UTF-8 BOM 추가
    const BOM = '\uFEFF';
    const csvContent = BOM + data;
    
    // 1. 텍스트 형식으로 Blob 생성 (blob 타입을 명확히 지정)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8-sig' });
    
    // 2. FileSaver.js 라이브러리 사용 (가장 안정적인 방법)
    // npm install file-saver
    // import saveAs from 'file-saver';
    // saveAs(blob, filename);
    
    // 2. 또는 기본 다운로드 방식 사용
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // 응답 값 정규화 함수
  const normalizeResponse = (value, type) => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'text':
        return sanitizeTextResponse(value);
      case 'scale_5':
      case 'scale_7':
        return isNaN(value) ? '' : String(Number(value));
      case 'single_choice':
      case 'multiple_choice':
        return String(value).trim();
      default:
        return String(value);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert severity="error" sx={{ mt: 2 }}>
          데이터를 불러오는 중 오류가 발생했습니다: {error}
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>설문 배포 결과 | 관리자</title>
      </Head>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          설문 배포 결과
        </Typography>
        <Typography variant="body2" color="text.secondary">
          설문 배포 현황을 확인하고 결과를 관리할 수 있습니다.
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>설문 제목</TableCell>
              <TableCell>회사</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell>참여율</TableCell>
              <TableCell>상태</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions.map((distribution) => {
              const completionRate = Math.round((distribution.current_responses / distribution.target_participants) * 100);
              
              return (
                <TableRow key={distribution.id}>
                  <TableCell>{distribution.title}</TableCell>
                  <TableCell>{distribution.company?.name}</TableCell>
                  <TableCell>{formatDate(distribution.created_at)}</TableCell>
                  <TableCell>
                    {distribution.current_responses}/{distribution.target_participants}
                    <Typography variant="caption" color="text.secondary" display="block">
                      ({completionRate}%)
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={distribution.status === 'active' ? '진행중' : '완료됨'}
                      color={distribution.status === 'active' ? 'primary' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="결과 보기">
                      <IconButton
                        component={Link}
                        href={`/results/dist/items?distributionId=${distribution.id}`}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="템플릿 다운로드">
                      <IconButton
                        onClick={() => handleDownloadTemplate(distribution)}
                        size="small"
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="결과 업로드">
                      <IconButton
                        onClick={() => handleOpenUploadDialog(distribution)}
                        size="small"
                      >
                        <UploadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="임의 응답 생성">
                      <IconButton
                        onClick={() => generateRandomResponses(distribution)}
                        size="small"
                        color="secondary"
                      >
                        <AutoAwesomeIcon />
                      </IconButton>
                    </Tooltip>
                    {distribution.status === 'active' && (
                      <Tooltip title="강제 완료">
                        <IconButton
                          onClick={() => handleForceComplete(distribution.id)}
                          size="small"
                          color="warning"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 업로드 다이얼로그 */}
      <Dialog
        open={uploadDialogOpen}
        onClose={!uploadLoading ? handleCloseUploadDialog : undefined}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>결과 데이터 업로드</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            업로드한 데이터는 기존 응답 데이터를 대체합니다. 진행 전 백업을 권장합니다.
          </Alert>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploadLoading}
            style={{ margin: '16px 0' }}
          />
          
          {uploadLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2">업로드 처리 중...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog} disabled={uploadLoading}>
            취소
          </Button>
          <Button 
            onClick={handleUpload}
            color="primary"
            disabled={!uploadFile || uploadLoading}
          >
            업로드
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
} 