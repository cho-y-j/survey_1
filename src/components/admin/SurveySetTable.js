import { useState, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  InputAdornment,
  Autocomplete,
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { supabase } from '@/utils/supabase';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Link from 'next/link';

// 자주 사용되는 설문 유형 (제안용)
const SURVEY_TYPES = [
  { value: 'demographic', label: '인구통계학적' },
  { value: 'organizational', label: 'OCI조직문화' },
  { value: 'satisfaction', label: 'CGS분석' },
  { value: 'engagement', label: '업무몰입' },
  { value: 'leadership', label: '리더십' }
];

export default function SurveySetTable({ surveySets, onSurveySetChange }) {
  const [editMode, setEditMode] = useState(false);
  const [currentSurveySet, setCurrentSurveySet] = useState(null);
  const [surveySetName, setSurveySetName] = useState('');
  const [surveySetType, setSurveySetType] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [surveySetToDelete, setSurveySetToDelete] = useState(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [surveySetToCopy, setSurveySetToCopy] = useState(null);
  const [newSurveySetName, setNewSurveySetName] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadSurveySetName, setUploadSurveySetName] = useState('');
  const [uploadSurveySetType, setUploadSurveySetType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [questionCounts, setQuestionCounts] = useState({});

  // 문항 개수 가져오기
  const fetchQuestionCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('survey_set_id')
        .order('survey_set_id');
      
      if (error) throw error;

      // 각 설문셋 ID별 문항 개수 계산
      const counts = {};
      data.forEach(item => {
        counts[item.survey_set_id] = (counts[item.survey_set_id] || 0) + 1;
      });
      
      setQuestionCounts(counts);
    } catch (error) {
      console.error('문항 개수 조회 중 오류 발생:', error.message);
    }
  };

  // 컴포넌트 마운트시 문항 개수 가져오기
  useEffect(() => {
    fetchQuestionCounts();
  }, []);

  // 다이얼로그 열기
  const handleAddClick = () => {
    setEditMode(false);
    setSurveySetName('');
    setSurveySetType('');
    setAddDialogOpen(true);
  };

  // 수정 모드 열기
  const handleEditClick = (surveySet) => {
    setEditMode(true);
    setCurrentSurveySet(surveySet);
    setSurveySetName(surveySet.name);
    setSurveySetType(surveySet.type);
    setAddDialogOpen(true);
  };

  // 다이얼로그 닫기
  const handleDialogClose = () => {
    setAddDialogOpen(false);
    setCurrentSurveySet(null);
    setSurveySetName('');
    setSurveySetType('');
    setEditMode(false);
  };

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (surveySet) => {
    setSurveySetToDelete(surveySet);
    setDeleteDialogOpen(true);
  };

  // 삭제 다이얼로그 닫기
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSurveySetToDelete(null);
  };

  // 복제 다이얼로그 열기
  const handleCopyClick = (surveySet) => {
    setSurveySetToCopy(surveySet);
    setNewSurveySetName(`${surveySet.name} (복사본)`);
    setCopyDialogOpen(true);
  };

  // 복제 다이얼로그 닫기
  const handleCopyDialogClose = () => {
    setCopyDialogOpen(false);
    setSurveySetToCopy(null);
    setNewSurveySetName('');
  };

  // 업로드 다이얼로그 열기
  const handleUploadClick = () => {
    setUploadDialogOpen(true);
    setSelectedFile(null);
    setUploadError('');
    setUploadSurveySetName('');
    setUploadSurveySetType('');
  };

  // 업로드 다이얼로그 닫기
  const handleUploadDialogClose = () => {
    setUploadDialogOpen(false);
    setSelectedFile(null);
    setUploadError('');
    setUploadSurveySetName('');
    setUploadSurveySetType('');
  };

  // 파일 선택 처리
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          selectedFile.type === 'application/vnd.ms-excel') {
        setSelectedFile(selectedFile);
        setUploadError('');
        // 파일 이름에서 확장자 제거하여 기본 설문셋 이름으로 설정
        const fileName = selectedFile.name.replace(/\.(xlsx|xls)$/, '');
        setUploadSurveySetName(fileName);
      } else {
        setUploadError('엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다.');
        setSelectedFile(null);
      }
    }
  };

  // 설문셋 추가
  const handleAddSurveySet = async () => {
    if (!surveySetName.trim() || !surveySetType.trim()) return;

    try {
      const { data, error } = await supabase
        .from('survey_sets')
        .insert([{ 
          name: surveySetName.trim(),
          type: surveySetType.trim()
        }])
        .select();

      if (error) throw error;
      onSurveySetChange(data[0], 'add');
      handleDialogClose();
      // 문항 개수 갱신
      fetchQuestionCounts();
    } catch (error) {
      console.error('설문셋 추가 중 오류 발생:', error.message);
      alert(`설문셋 추가 실패: ${error.message}`);
    }
  };

  // 설문셋 수정
  const handleUpdateSurveySet = async () => {
    if (!surveySetName.trim() || !surveySetType.trim() || !currentSurveySet) return;

    try {
      const { data, error } = await supabase
        .from('survey_sets')
        .update({ 
          name: surveySetName.trim(),
          type: surveySetType.trim()
        })
        .eq('id', currentSurveySet.id)
        .select();

      if (error) throw error;
      onSurveySetChange({ ...currentSurveySet, name: surveySetName.trim(), type: surveySetType }, 'update');
      handleDialogClose();
    } catch (error) {
      console.error('설문셋 수정 중 오류 발생:', error.message);
      alert(`설문셋 수정 실패: ${error.message}`);
    }
  };

  // 설문셋 삭제
  const handleDeleteSurveySet = async () => {
    if (!surveySetToDelete) return;

    try {
      // 관련 문항 먼저 삭제
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('survey_set_id', surveySetToDelete.id);

      if (questionsError) throw questionsError;

      // 설문셋 삭제
      const { error } = await supabase
        .from('survey_sets')
        .delete()
        .eq('id', surveySetToDelete.id);

      if (error) throw error;
      onSurveySetChange(surveySetToDelete, 'delete');
      handleDeleteDialogClose();
      // 문항 개수 갱신
      fetchQuestionCounts();
    } catch (error) {
      console.error('설문셋 삭제 중 오류 발생:', error.message);
      alert(`설문셋 삭제 실패: ${error.message}`);
      handleDeleteDialogClose();
    }
  };

  // 설문셋 복제
  const handleCopySurveySet = async () => {
    if (!surveySetToCopy || !newSurveySetName.trim()) return;

    try {
      // 1. 새 설문셋 생성
      const { data: newSurveySet, error: createError } = await supabase
        .from('survey_sets')
        .insert([{ 
          name: newSurveySetName.trim(),
          type: surveySetToCopy.type
        }])
        .select();

      if (createError) throw createError;

      // 2. 원본 설문셋의 문항 가져오기
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_set_id', surveySetToCopy.id);

      if (questionsError) throw questionsError;

      // 3. 새 설문셋에 문항 복제
      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          survey_set_id: newSurveySet[0].id,
          question_id: q.question_id,
          question_category: q.question_category,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          is_required: q.is_required
        }));

        const { error: insertError } = await supabase
          .from('questions')
          .insert(newQuestions);

        if (insertError) throw insertError;
      }

      onSurveySetChange(newSurveySet[0], 'add');
      handleCopyDialogClose();
      // 문항 개수 갱신
      fetchQuestionCounts();
    } catch (error) {
      console.error('설문셋 복제 중 오류 발생:', error.message);
      alert(`설문셋 복제 실패: ${error.message}`);
      handleCopyDialogClose();
    }
  };

  // 엑셀 파일 업로드 및 설문셋 생성
  const handleExcelUpload = async () => {
    if (!selectedFile) {
      setUploadError('파일을 선택해주세요.');
      return;
    }

    if (!uploadSurveySetName) {
      setUploadError('설문셋 이름을 입력해주세요.');
      return;
    }

    if (!uploadSurveySetType) {
      setUploadError('설문셋 유형을 입력해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('surveySetName', uploadSurveySetName);
    formData.append('surveySetType', uploadSurveySetType);

    setUploading(true);
    setUploadError('');

    try {
      const response = await fetch('/api/surveys/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '업로드 중 오류가 발생했습니다.');
      }

      // 성공적으로 업로드 완료
      setUploadSuccess(true);
      handleUploadDialogClose();
      onSurveySetChange(result.surveySet, 'add');
      
      // 문항 개수 갱신
      fetchQuestionCounts();
      
      // 성공 메시지 표시
      alert(`설문셋 '${result.surveySet.name}'이(가) 생성되었습니다. ${result.questionCount}개의 문항이 추가되었습니다.`);
    } catch (error) {
      console.error('업로드 오류:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  // 설문 유형 라벨 찾기
  const getTypeLabel = (type) => {
    const typeObj = SURVEY_TYPES.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  // 현재 사용 중인 유형들에 기본 유형 추가
  const getAllTypes = () => {
    const existingTypes = [...new Set(surveySets.map(s => s.type))];
    const suggestedTypes = SURVEY_TYPES.map(t => t.value);
    return [...new Set([...existingTypes, ...suggestedTypes])];
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          설문셋 목록
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<UploadFileIcon />}
            onClick={handleUploadClick}
            sx={{ mr: 1 }}
          >
            엑셀 업로드
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            설문셋 추가
          </Button>
        </Box>
      </Box>
      
      {/* 설문셋 추가/수정 다이얼로그 */}
      <Dialog 
        open={addDialogOpen}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editMode ? '설문셋 정보 수정' : '새 설문셋 추가'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="설문셋 이름"
            type="text"
            fullWidth
            variant="outlined"
            value={surveySetName}
            onChange={(e) => setSurveySetName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Autocomplete
            freeSolo
            id="survey-type"
            options={getAllTypes()}
            value={surveySetType}
            onChange={(event, newValue) => {
              setSurveySetType(newValue || '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="설문 유형"
                variant="outlined"
                onChange={(e) => setSurveySetType(e.target.value)}
                fullWidth
                helperText="자주 사용되는 유형 중 선택하거나 직접 입력하세요"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                {getTypeLabel(option) || option}
              </li>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            취소
          </Button>
          <Button 
            onClick={editMode ? handleUpdateSurveySet : handleAddSurveySet} 
            variant="contained"
            disabled={!surveySetName.trim() || !surveySetType.trim()}
          >
            {editMode ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 설문셋 복제 다이얼로그 */}
      <Dialog open={copyDialogOpen} onClose={handleCopyDialogClose}>
        <DialogTitle>설문셋 복제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            '{surveySetToCopy?.name}' 설문셋을 복제합니다. 새 설문셋의 이름을 입력하세요.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="copyName"
            label="새 설문셋 이름"
            type="text"
            fullWidth
            variant="outlined"
            value={newSurveySetName}
            onChange={(e) => setNewSurveySetName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyDialogClose}>취소</Button>
          <Button onClick={handleCopySurveySet} variant="contained">복제</Button>
        </DialogActions>
      </Dialog>

      {/* 엑셀 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onClose={handleUploadDialogClose} fullWidth maxWidth="md">
        <DialogTitle>엑셀 파일 업로드</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <DialogContentText>
                설문셋과 문항이 포함된 엑셀 파일을 업로드하세요. 
                파일 형식은 .xlsx 또는 .xls를 지원합니다.
              </DialogContentText>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                margin="dense"
                label="설문셋 이름"
                type="text"
                fullWidth
                variant="outlined"
                value={uploadSurveySetName}
                onChange={(e) => setUploadSurveySetName(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={getAllTypes()}
                value={uploadSurveySetType}
                onChange={(event, newValue) => {
                  setUploadSurveySetType(newValue || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="설문 유형"
                    variant="outlined"
                    onChange={(e) => setUploadSurveySetType(e.target.value)}
                    fullWidth
                    required
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    {getTypeLabel(option) || option}
                  </li>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  엑셀 파일 포맷 안내
                </Typography>
                <Typography variant="body2" gutterBottom>
                  엑셀 파일은 다음 필수 열을 포함해야 합니다:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>question_id: 문항 식별자 (예: Q1, Q2)</li>
                  <li>question_category: 문항 카테고리 (예: 직무만족, 조직문화)</li>
                  <li>question_text: 질문 내용</li>
                  <li>question_type: 문항 유형 (single_choice, multiple_choice, scale_5, scale_7, text)</li>
                  <li>options: 선택 문항의 경우 콤마로 구분된 선택지 (예: "매우 그렇다,그렇다,보통이다,아니다,전혀 아니다")</li>
                  <li>is_required: 필수 응답 여부 (TRUE/FALSE 또는 1/0)</li>
                </Box>
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{ mt: 1 }}
                  onClick={() => window.open('/api/surveys/template', '_blank')}
                >
                  샘플 템플릿 다운로드
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ 
                border: '2px dashed #ccc', 
                borderRadius: 1, 
                p: 3, 
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
              }}>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadFileIcon />}
                >
                  파일 선택
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                {selectedFile && (
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={selectedFile.name}
                      onDelete={() => setSelectedFile(null)}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {uploadError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {uploadError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUploadDialogClose}>취소</Button>
          <Button 
            onClick={handleExcelUpload} 
            variant="contained"
            disabled={!selectedFile || !uploadSurveySetName.trim() || !uploadSurveySetType.trim()}
          >
            업로드
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="설문셋 목록 테이블">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>설문셋 이름</TableCell>
              <TableCell>설문 유형</TableCell>
              <TableCell>문항 수</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {surveySets.length > 0 ? (
              // 생성일 기준 내림차순 정렬 (최신순)
              [...surveySets]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((surveySet) => (
                <TableRow
                  key={surveySet.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">{surveySet.id}</TableCell>
                  <TableCell>{surveySet.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getTypeLabel(surveySet.type) || surveySet.type} 
                      size="small"
                      color={
                        surveySet.type === 'demographic' ? 'primary' :
                        surveySet.type === 'organizational' ? 'secondary' :
                        surveySet.type === 'satisfaction' ? 'success' :
                        surveySet.type === 'engagement' ? 'info' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {questionCounts[surveySet.id] || 0}개 문항
                  </TableCell>
                  <TableCell>{new Date(surveySet.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="문항 관리">
                      <IconButton 
                        aria-label="questions"
                        component={Link}
                        href={`/admin/surveys/${surveySet.id}/questions`}
                      >
                        <ListAltIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="복제">
                      <IconButton 
                        aria-label="copy"
                        onClick={() => handleCopyClick(surveySet)}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="수정">
                      <IconButton 
                        aria-label="edit"
                        onClick={() => handleEditClick(surveySet)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton 
                        aria-label="delete"
                        onClick={() => handleDeleteClick(surveySet)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  등록된 설문셋이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog 
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteSurveySet}
        title="설문셋 삭제"
        message={`'${surveySetToDelete?.name}' 설문셋을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 문항도 함께 삭제됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        severity="error"
      />
    </>
  );
} 