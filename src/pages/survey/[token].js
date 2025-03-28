import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';
import Head from 'next/head';
import { 
  Container, Box, Typography, Button, Stepper, Step, StepLabel,
  Paper, RadioGroup, FormControlLabel, Radio, Checkbox, TextField,
  Rating, FormHelperText, Alert, LinearProgress, AppBar, Toolbar,
  IconButton, Card, CardContent, Divider, useMediaQuery, Stack,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export default function SurveyPage() {
  const router = useRouter();
  const { token } = router.query;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // 설문 데이터 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [surveySets, setSurveySets] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // 진행 상태 계산용
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(0);
  
  // 스크롤 처리용 ref
  const questionRefs = useRef({});
  const topRef = useRef(null);
  
  // 설문 데이터 가져오기
  useEffect(() => {
    if (!token) return;
    fetchSurvey();
  }, [token]);
  
  // 응답 개수 추적
  useEffect(() => {
    const answeredCount = Object.keys(answers).length;
    setAnsweredQuestions(answeredCount);
  }, [answers]);
  
  // 에러 발생 시 해당 질문으로 스크롤
  useEffect(() => {
    if (errors.length > 0) {
      setTimeout(() => {
        const firstErrorId = errors[0];
        if (questionRefs.current[firstErrorId]) {
          questionRefs.current[firstErrorId].scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    }
  }, [errors]);
  
  // 옵션 파싱 유틸리티 함수
  const parseOptions = (options) => {
    if (!options) return [];
    
    // 이미 배열인 경우
    if (Array.isArray(options)) {
      return options;
    }
    
    // 문자열인 경우 쉼표로 분리
    if (typeof options === 'string') {
      return options.split(',').map(opt => opt.trim());
    }
    
    // 기타 경우
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [String(options)];
    } catch (e) {
      return [String(options)];
    }
  };
  
  const fetchSurvey = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // 설문 배포 정보 가져오기
      const { data: distributionData, error: distributionError } = await supabase
        .from('survey_distributions')
        .select('*')
        .eq('access_token', token)
        .single();
        
      if (distributionError) throw distributionError;
      if (!distributionData) throw new Error('설문을 찾을 수 없습니다.');
      
      setDistribution(distributionData);
      
      // 설문셋 ID 목록 파싱
      let surveySetIds;
      try {
        surveySetIds = Array.isArray(distributionData.survey_set_ids) 
          ? distributionData.survey_set_ids 
          : JSON.parse(distributionData.survey_set_ids);
      } catch (e) {
        surveySetIds = distributionData.survey_set_ids.split(',').map(id => id.trim());
      }
      
      if (!Array.isArray(surveySetIds)) {
        surveySetIds = [surveySetIds];
      }
      
      // 설문셋 정보 가져오기
      const { data: surveySetData, error: surveySetError } = await supabase
        .from('survey_sets')
        .select('*')
        .in('id', surveySetIds);
        
      if (surveySetError) throw surveySetError;
      
      // 설문셋을 설문 배포에 지정된 순서대로 정렬
      const orderedSets = surveySetIds.map(id => 
        surveySetData.find(set => set.id === id)
      ).filter(Boolean);
      
      setSurveySets(orderedSets);
      
      // 모든 설문셋의 질문 가져오기
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('survey_set_id', surveySetIds)
        .order('created_at');
        
      if (questionsError) throw questionsError;
      
      // 설문셋별로 질문 그룹화
      const groupedQuestions = orderedSets.map(set => {
        return questionsData.filter(q => q.survey_set_id === set.id);
      });
      
      setQuestions(groupedQuestions);
      setTotalQuestions(questionsData.length);
      
    } catch (error) {
      console.error('설문 정보 가져오기 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 응답 처리 함수 - 자동 스크롤 추가
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // 오류 목록에서 해당 질문 제거
    if (errors.includes(questionId)) {
      setErrors(prev => prev.filter(id => id !== questionId));
    }
    
    // 다음 질문으로 자동 스크롤 추가
    setTimeout(() => {
      const currentQuestions = questions[currentSetIndex] || [];
      const currentIndex = currentQuestions.findIndex(q => q.id === questionId);
      
      // 현재 설문셋에 다음 질문이 있는 경우
      if (currentIndex >= 0 && currentIndex < currentQuestions.length - 1) {
        const nextQuestion = currentQuestions[currentIndex + 1];
        if (questionRefs.current[nextQuestion.id]) {
          questionRefs.current[nextQuestion.id].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }, 300); // 300ms 지연
  };
  
  // 다음 설문셋으로 이동
  const handleNext = () => {
    // 현재 설문셋의 필수 질문 검증
    const currentQuestions = questions[currentSetIndex] || [];
    const unansweredRequiredQuestions = currentQuestions
      .filter(q => q.is_required && (!answers[q.id] || answers[q.id] === ''))
      .map(q => q.id);
    
    if (unansweredRequiredQuestions.length > 0) {
      setErrors(unansweredRequiredQuestions);
      return;
    }
    
    // 마지막 설문셋이면 제출, 아니면 다음으로
    if (currentSetIndex === surveySets.length - 1) {
      handleSubmit();
    } else {
      setCurrentSetIndex(prev => prev + 1);
      setErrors([]);
      
      // 페이지 상단으로 스크롤
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  
  // 이전 설문셋으로 이동
  const handlePrevious = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(prev => prev - 1);
      setErrors([]);
      
      // 페이지 상단으로 스크롤
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  
  // 응답 제출
  const handleSubmit = async () => {
    try {
      // 모든 필수 질문 검증
      const allQuestions = questions.flat();
      const unansweredRequiredQuestions = allQuestions
        .filter(q => q.is_required && (!answers[q.id] || answers[q.id] === ''))
        .map(q => q.id);
      
      if (unansweredRequiredQuestions.length > 0) {
        // 필수 응답 누락된 질문이 있는 설문셋으로 이동
        for (let i = 0; i < questions.length; i++) {
          const setQuestions = questions[i];
          const hasUnanswered = setQuestions.some(q => 
            unansweredRequiredQuestions.includes(q.id)
          );
          
          if (hasUnanswered) {
            setCurrentSetIndex(i);
            setErrors(setQuestions
              .filter(q => unansweredRequiredQuestions.includes(q.id))
              .map(q => q.id)
            );
            return;
          }
        }
        return;
      }
      
      // 사용자 ID 생성
      const userId = crypto.randomUUID ? crypto.randomUUID() : 
                    `user_${Math.random().toString(36).substring(2, 9)}`;
      
      // 응답 데이터 생성
      const responseData = Object.entries(answers).map(([questionId, answer]) => ({
        survey_distribution_id: distribution.id,
        question_id: questionId,
        answer: answer.toString(),
        user_id: userId
      }));
      
      // 응답 저장
      const { error: responseError } = await supabase
        .from('responses')
        .insert(responseData);
      
      if (responseError) throw responseError;
      
      // 설문 참여자 수 업데이트
      const { error: updateError } = await supabase
        .from('survey_distributions')
        .update({ 
          current_responses: distribution.current_responses + 1 
        })
        .eq('id', distribution.id);
      
      if (updateError) throw updateError;
      
      // 완료 상태로 변경
      setCompleted(true);
      
    } catch (error) {
      console.error('응답 제출 오류:', error);
      alert('응답 제출 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };
  
  // 로딩 중 표시
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            설문을 불러오는 중입니다...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // 오류 표시
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ my: 4 }}>
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={() => router.push('/')}
        >
          홈으로 돌아가기
        </Button>
      </Container>
    );
  }
  
  // 설문 완료 화면
  if (completed) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              설문이 완료되었습니다
            </Typography>
            <Typography variant="body1" paragraph>
              소중한 응답에 감사드립니다. 응답 내용이 성공적으로 저장되었습니다.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => router.push('/')}
              sx={{ mt: 2 }}
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }
  
  // 현재 설문셋
  const currentSurveySet = surveySets[currentSetIndex];
  const currentSetQuestions = questions[currentSetIndex] || [];
  
  // 전체 진행률 계산
  const progressPercentage = (answeredQuestions / totalQuestions) * 100;
  
  return (
    <>
      <Head>
        <title>{distribution?.title || '설문 참여'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      
      {/* 상단 앱바 - 진행 상태 표시 */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" noWrap component="div" sx={{ fontWeight: 'bold' }}>
              {distribution?.title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {answeredQuestions}/{totalQuestions} 응답
            </Typography>
            <Typography variant="body2" sx={{ ml: 1 }}>
              {Math.round(progressPercentage)}%
            </Typography>
          </Box>
        </Toolbar>
        
        {/* 진행 바 */}
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ height: 4 }}
        />
      </AppBar>
      
      <Box ref={topRef} sx={{ pt: 8 }} /> {/* 앱바 높이만큼 상단 여백 */}
      
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* 설문셋 네비게이션 */}
        <Paper sx={{ mb: 3, p: 2, display: { xs: 'none', sm: 'block' } }}>
          <Stepper 
            activeStep={currentSetIndex} 
            alternativeLabel={surveySets.length > 3}
          >
            {surveySets.map((set, index) => (
              <Step key={set.id}>
                <StepLabel>{set.name}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
        
        {/* 모바일 네비게이션 */}
        <Paper sx={{ mb: 3, p: 2, display: { xs: 'block', sm: 'none' } }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            설문 {currentSetIndex + 1} / {surveySets.length}
          </Typography>
          <Typography variant="h6">
            {currentSurveySet?.name}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(currentSetIndex / surveySets.length) * 100} 
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        </Paper>
        
        {/* 오류 메시지 - 미응답 필수 질문이 있는 경우 */}
        {errors.length > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            icon={<ErrorIcon fontSize="inherit" />}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => {
                  if (questionRefs.current[errors[0]]) {
                    questionRefs.current[errors[0]].scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'center'
                    });
                  }
                }}
              >
                해당 질문으로 이동
              </Button>
            }
          >
            <Typography fontWeight="bold">
              응답하지 않은 필수 질문이 {errors.length}개 있습니다.
            </Typography>
          </Alert>
        )}
        
        {/* 설문 질문 목록 */}
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h5" gutterBottom>
            {currentSurveySet?.name}
          </Typography>
          
          <Divider sx={{ mb: 3 }} />
          
          {currentSetQuestions.map((question, index) => (
            <Box 
              key={question.id} 
              ref={el => questionRefs.current[question.id] = el}
              sx={{ 
                mb: 4,
                p: 2,
                borderRadius: 1,
                border: errors.includes(question.id) ? '2px solid red' : '1px solid #eee',
                backgroundColor: errors.includes(question.id) ? 'rgba(255,0,0,0.05)' : 'transparent'
              }}
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 'bold',
                  color: errors.includes(question.id) ? 'error.main' : 'text.primary'
                }}
              >
                {index + 1}. {question.question_text}
                {question.is_required && <span style={{ color: 'red' }}> *</span>}
              </Typography>
              
              {errors.includes(question.id) && (
                <Alert severity="error" sx={{ mt: 1, mb: 2 }} icon={false}>
                  이 질문은 필수 응답 항목입니다.
                </Alert>
              )}
              
              <Box sx={{ mt: 2 }}>
                {/* 질문 유형별 입력 컴포넌트 */}
                {question.question_type === 'single_choice' && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    <Stack spacing={1}>
                      {parseOptions(question.options).map((option, optIndex) => (
                        <FormControlLabel
                          key={optIndex}
                          value={option.trim()}
                          control={<Radio />}
                          label={option.trim()}
                          sx={{ 
                            p: 1,
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'action.hover' }
                          }}
                        />
                      ))}
                    </Stack>
                  </RadioGroup>
                )}
                
                {question.question_type === 'multiple_choice' && (
                  <Stack spacing={1}>
                    {parseOptions(question.options).map((option, optIndex) => {
                      const isChecked = Array.isArray(answers[question.id]) 
                        ? answers[question.id].includes(option.trim())
                        : false;
                      
                      return (
                        <FormControlLabel
                          key={optIndex}
                          control={
                            <Checkbox 
                              checked={isChecked}
                              onChange={(e) => {
                                const currentValues = Array.isArray(answers[question.id]) 
                                  ? [...answers[question.id]] 
                                  : [];
                                
                                if (e.target.checked) {
                                  handleAnswerChange(question.id, [...currentValues, option.trim()]);
                                } else {
                                  handleAnswerChange(
                                    question.id, 
                                    currentValues.filter(v => v !== option.trim())
                                  );
                                }
                              }}
                            />
                          }
                          label={option.trim()}
                          sx={{ 
                            p: 1,
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'action.hover' }
                          }}
                        />
                      );
                    })}
                  </Stack>
                )}
                
                {question.question_type.startsWith('scale_') && (
                  <Box sx={{ mt: 2 }}>
                    {(() => {
                      const options = parseOptions(question.options);
                      const scaleMax = parseInt(question.question_type.split('_')[1]) || 5;
                      
                      // 옵션이 있는 경우: 세로로 라디오 버튼 표시
                      if (options.length > 0) {
                        return (
                          <RadioGroup
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          >
                            <Stack spacing={1}>
                              {options.map((option, index) => (
                                <FormControlLabel
                                  key={index}
                                  value={String(index + 1)}
                                  control={<Radio />}
                                  label={option}
                                  sx={{ 
                                    p: 1,
                                    borderRadius: 1,
                                    '&:hover': { backgroundColor: 'action.hover' }
                                  }}
                                />
                              ))}
                            </Stack>
                          </RadioGroup>
                        );
                      }
                      
                      // 옵션이 없는 경우: 별표 레이팅 사용
                      return (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Rating
                            value={Number(answers[question.id]) || 0}
                            onChange={(e, newValue) => handleAnswerChange(question.id, newValue)}
                            max={scaleMax}
                            size="large"
                            sx={{ fontSize: '2rem' }}
                          />
                        </Box>
                      );
                    })()}
                  </Box>
                )}
                
                {question.question_type === 'text' && (
                  <TextField
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="응답을 입력해주세요"
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Box>
          ))}
          
          {/* 네비게이션 버튼 */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mt: 4,
            pt: 2,
            borderTop: '1px solid #eee'
          }}>
            <Button
              onClick={handlePrevious}
              disabled={currentSetIndex === 0}
              startIcon={<ArrowBackIcon />}
            >
              이전
            </Button>
            
            <Button
              onClick={handleNext}
              variant="contained"
              color="primary"
              endIcon={currentSetIndex === surveySets.length - 1 
                ? <CheckCircleIcon /> 
                : <ArrowForwardIcon />
              }
            >
              {currentSetIndex === surveySets.length - 1 ? '제출하기' : '다음'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
}
