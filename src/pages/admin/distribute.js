import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Grid,
  Alert,
  Card,
  CardContent,
  IconButton,
  Link,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ko } from 'date-fns/locale';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import DistributionList from '@/components/admin/DistributionList';

export default function DistributePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 0: 설문 목록, 1: 새 설문 배포
  
  // 폼 상태
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [selectedSurveySetIds, setSelectedSurveySetIds] = useState([]);
  const [targetParticipants, setTargetParticipants] = useState(100);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 14))); // 기본 2주 후
  
  // 데이터 목록
  const [companies, setCompanies] = useState([]);
  const [surveySets, setSurveySets] = useState([]);
  const [selectedSurveySets, setSelectedSurveySets] = useState([]);
  const [distributions, setDistributions] = useState([]);
  
  // 배포된 설문 링크
  const [distributionLink, setDistributionLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    try {
      // 회사 데이터 불러오기
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (companiesError) throw companiesError;
      setCompanies(companiesData);

      // 설문셋 데이터 불러오기
      const { data: surveySetsData, error: surveySetsError } = await supabase
        .from('survey_sets')
        .select('*')
        .order('name');
      
      if (surveySetsError) throw surveySetsError;
      setSurveySets(surveySetsData);

      // 배포 데이터 불러오기 (최근 10개)
      const { data: distributionsData, error: distributionsError } = await supabase
        .from('survey_distributions')
        .select(`
          *,
          company:companies(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (distributionsError) throw distributionsError;
      
      // 설문셋 정보 가공
      const processedDistributions = await Promise.all(
        distributionsData.map(async (distribution) => {
          // survey_set_ids에서 설문셋 ID 배열 추출
          let surveySetIds;
          try {
            if (Array.isArray(distribution.survey_set_ids)) {
              surveySetIds = distribution.survey_set_ids;
            } else if (typeof distribution.survey_set_ids === 'string') {
              try {
                surveySetIds = JSON.parse(distribution.survey_set_ids);
              } catch {
                surveySetIds = distribution.survey_set_ids.split(',').map(id => id.trim());
              }
            } else {
              surveySetIds = [];
            }
          } catch (error) {
            console.error('Survey set IDs parsing error:', error);
            surveySetIds = [];
          }
          
          // 해당 설문셋 정보 가져오기
          if (surveySetIds.length > 0) {
            const { data: distributionSets, error: setsError } = await supabase
              .from('survey_sets')
              .select('id, name')
              .in('id', surveySetIds);
            
            if (!setsError && distributionSets) {
              // 순서대로 정렬하여 추가 정보 포함
              const orderedSets = surveySetIds.map(id => {
                const set = distributionSets.find(s => s.id === id);
                return set ? { 
                  id: set.id,
                  survey_set: set
                } : null;
              }).filter(Boolean);
              
              return {
                ...distribution,
                survey_distribution_sets: orderedSets
              };
            }
          }
          
          return {
            ...distribution,
            survey_distribution_sets: []
          };
        })
      );
      
      setDistributions(processedDistributions);
      setError(null);
    } catch (error) {
      console.error('데이터 불러오기 오류:', error.message);
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 설문셋 선택 처리
  const handleSurveySetSelect = (event) => {
    const surveySetId = event.target.value;
    const surveySet = surveySets.find(set => set.id === surveySetId);
    
    if (surveySet && !selectedSurveySetIds.includes(surveySetId)) {
      setSelectedSurveySetIds([...selectedSurveySetIds, surveySetId]);
      setSelectedSurveySets([...selectedSurveySets, surveySet]);
    }
  };

  // 선택된 설문셋 삭제
  const handleRemoveSurveySet = (surveySetId) => {
    setSelectedSurveySetIds(selectedSurveySetIds.filter(id => id !== surveySetId));
    setSelectedSurveySets(selectedSurveySets.filter(set => set.id !== surveySetId));
  };

  // 설문셋 순서 변경
  const handleMoveSurveySet = (index, direction) => {
    const newSelectedSurveySets = [...selectedSurveySets];
    const newSelectedSurveySetIds = [...selectedSurveySetIds];
    
    if (direction === 'up' && index > 0) {
      // 위로 이동
      [newSelectedSurveySets[index], newSelectedSurveySets[index - 1]] = 
        [newSelectedSurveySets[index - 1], newSelectedSurveySets[index]];
      [newSelectedSurveySetIds[index], newSelectedSurveySetIds[index - 1]] = 
        [newSelectedSurveySetIds[index - 1], newSelectedSurveySetIds[index]];
    } else if (direction === 'down' && index < selectedSurveySets.length - 1) {
      // 아래로 이동
      [newSelectedSurveySets[index], newSelectedSurveySets[index + 1]] = 
        [newSelectedSurveySets[index + 1], newSelectedSurveySets[index]];
      [newSelectedSurveySetIds[index], newSelectedSurveySetIds[index + 1]] = 
        [newSelectedSurveySetIds[index + 1], newSelectedSurveySetIds[index]];
    }
    
    setSelectedSurveySets(newSelectedSurveySets);
    setSelectedSurveySetIds(newSelectedSurveySetIds);
  };

  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !companyId || selectedSurveySetIds.length === 0) {
      setError('필수 항목을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 토큰 생성
      const token = generateToken();
      
      // 설문 배포 데이터 생성
      const distributionData = {
        title: title.trim(),
        company_id: companyId,
        survey_set_ids: selectedSurveySetIds.join(','),  // 쉼표로 구분된 문자열로 변환
        target_participants: targetParticipants,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        current_responses: 0,
        access_token: token,
        url: `/survey/${token}`
      };

      // 설문 배포 데이터 저장
      const { data, error } = await supabase
        .from('survey_distributions')
        .insert([distributionData])
        .select()
        .single();

      if (error) throw error;

      // 성공 메시지 설정
      setSuccessMessage('설문이 성공적으로 배포되었습니다.');
      // 전체 URL 생성
      const fullUrl = `${window.location.origin}/survey/${token}`;
      setDistributionLink(fullUrl);

      // 폼 초기화
      setTitle('');
      setCompanyId('');
      setSelectedSurveySetIds([]);
      setSelectedSurveySets([]);
      setTargetParticipants(100);
      setStartDate(new Date());
      setEndDate(new Date(new Date().setDate(new Date().getDate() + 14)));

      // 데이터 새로고침
      fetchData();
    } catch (error) {
      console.error('설문 배포 오류:', error.message);
      setError(`설문 배포 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 배포 토큰 생성
  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // 링크 복사
  const copyLink = () => {
    navigator.clipboard.writeText(distributionLink)
      .then(() => {
        // 복사 성공 메시지 표시
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch(err => {
        console.error('링크 복사에 실패했습니다:', err);
        alert('링크 복사에 실패했습니다. 직접 선택하여 복사해주세요.');
      });
  };

  // 미리보기 열기
  const openPreview = () => {
    window.open(distributionLink, '_blank');
  };

  // 폼 초기화
  const resetForm = () => {
    setTitle('');
    setCompanyId('');
    setSelectedSurveySetIds([]);
    setSelectedSurveySets([]);
    setTargetParticipants(100);
    setStartDate(new Date());
    setEndDate(new Date(new Date().setDate(new Date().getDate() + 14)));
  };

  // 탭 변경 처리
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <AdminLayout title="설문 배포 관리">
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {error && (
        <ErrorAlert
          title="오류 발생"
          message={error}
          onRetry={fetchData}
        />
      )}

      {loading ? (
        <LoadingSpinner message="데이터를 불러오는 중..." />
      ) : (
        <Box sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="배포된 설문 목록" />
            <Tab label="새 설문 배포" icon={<AddIcon />} iconPosition="start" />
          </Tabs>
          
          <Divider sx={{ mb: 3 }} />

          {activeTab === 0 ? (
            // 배포된 설문 목록
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  배포된 설문 목록
                </Typography>
                <DistributionList 
                  distributions={distributions} 
                  onRefresh={fetchData} 
                />
              </CardContent>
            </Card>
          ) : (
            // 새 설문 배포 폼
            <Card component="form" onSubmit={handleSubmit}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  새 설문 배포
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="설문 제목"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel id="company-select-label">회사</InputLabel>
                      <Select
                        labelId="company-select-label"
                        value={companyId}
                        label="회사"
                        onChange={(e) => setCompanyId(e.target.value)}
                      >
                        {companies.map((company) => (
                          <MenuItem key={company.id} value={company.id}>
                            {company.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="목표 참여자 수"
                      type="number"
                      value={targetParticipants}
                      onChange={(e) => setTargetParticipants(Number(e.target.value))}
                      fullWidth
                      required
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
                      <DateTimePicker
                        label="시작일"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth required />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
                      <DateTimePicker
                        label="종료일"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth required />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="survey-set-select-label">설문셋 선택</InputLabel>
                      <Select
                        labelId="survey-set-select-label"
                        value=""
                        label="설문셋 선택"
                        onChange={handleSurveySetSelect}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>설문셋을 선택하세요</MenuItem>
                        {surveySets.map((surveySet) => (
                          <MenuItem 
                            key={surveySet.id} 
                            value={surveySet.id}
                            disabled={selectedSurveySetIds.includes(surveySet.id)}
                          >
                            {surveySet.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      선택된 설문셋 ({selectedSurveySets.length})
                    </Typography>
                    {selectedSurveySets.length > 0 ? (
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <List dense>
                          {selectedSurveySets.map((surveySet, index) => (
                            <ListItem key={surveySet.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                                <Chip label={index + 1} size="small" color="primary" />
                              </Box>
                              <ListItemText 
                                primary={surveySet.name} 
                                secondary={`유형: ${surveySet.type}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  edge="end" 
                                  aria-label="up"
                                  onClick={() => handleMoveSurveySet(index, 'up')}
                                  disabled={index === 0}
                                  size="small"
                                >
                                  <ArrowUpwardIcon />
                                </IconButton>
                                <IconButton 
                                  edge="end" 
                                  aria-label="down"
                                  onClick={() => handleMoveSurveySet(index, 'down')}
                                  disabled={index === selectedSurveySets.length - 1}
                                  size="small"
                                >
                                  <ArrowDownwardIcon />
                                </IconButton>
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => handleRemoveSurveySet(surveySet.id)}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        선택된 설문셋이 없습니다. 최소 1개 이상의 설문셋을 선택해주세요.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                <Button 
                  type="button" 
                  onClick={resetForm} 
                  sx={{ mr: 1 }}
                  disabled={submitting}
                >
                  초기화
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={submitting || selectedSurveySetIds.length === 0}
                >
                  {submitting ? '배포 중...' : '설문 배포하기'}
                </Button>
              </Box>
            </Card>
          )}

          {/* 배포 성공 시 링크 표시 */}
          {distributionLink && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  설문 링크가 생성되었습니다
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: 'action.hover',
                  p: 2,
                  borderRadius: 1
                }}>
                  <TextField
                    value={distributionLink}
                    fullWidth
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="링크 복사">
                            <IconButton onClick={copyLink}>
                              <ContentCopyIcon />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                    variant="outlined"
                    size="small"
                    onClick={(e) => e.target.select()}
                  />
                  <Tooltip title="미리보기">
                    <IconButton onClick={openPreview} color="primary" sx={{ ml: 1 }}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  이 링크를 복사하여 설문 참여자들에게 공유하세요.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* 복사 성공 메시지 표시 */}
          {linkCopied && (
            <Alert severity="success" sx={{ mt: 2 }}>
              링크가 클립보드에 복사되었습니다.
            </Alert>
          )}
        </Box>
      )}
    </AdminLayout>
  );
} 