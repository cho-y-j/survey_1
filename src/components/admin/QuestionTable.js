import { useState } from 'react';
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
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Chip,
  Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '@/utils/supabase';
import ConfirmDialog from '@/components/common/ConfirmDialog';

// 질문 유형 목록
const QUESTION_TYPES = [
  { value: 'single_choice', label: '단일 선택' },
  { value: 'multiple_choice', label: '다중 선택' },
  { value: 'scale_5', label: '5점 척도' },
  { value: 'scale_7', label: '7점 척도' },
  { value: 'text', label: '텍스트' }
];

export default function QuestionTable({ surveySet, questions, onQuestionChange }) {
  const [editMode, setEditMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionId, setQuestionId] = useState('');
  const [questionCategory, setQuestionCategory] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('single_choice');
  const [questionOptions, setQuestionOptions] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  // 다이얼로그 열기
  const handleAddClick = () => {
    setEditMode(false);
    setCurrentQuestion(null);
    setQuestionId('Q' + (questions.length + 1));
    setQuestionCategory('');
    setQuestionText('');
    setQuestionType('single_choice');
    setQuestionOptions('');
    setIsRequired(true);
    setFormDialogOpen(true);
  };

  // 수정 모드 열기
  const handleEditClick = (question) => {
    setEditMode(true);
    setCurrentQuestion(question);
    setQuestionId(question.question_id);
    setQuestionCategory(question.question_category);
    setQuestionText(question.question_text);
    setQuestionType(question.question_type);
    setQuestionOptions(question.options);
    setIsRequired(question.is_required);
    setFormDialogOpen(true);
  };

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (question) => {
    setQuestionToDelete(question);
    setDeleteDialogOpen(true);
  };

  // 삭제 다이얼로그 닫기
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setQuestionToDelete(null);
  };

  // 폼 다이얼로그 닫기
  const handleFormDialogClose = () => {
    setFormDialogOpen(false);
    resetForm();
  };

  // 폼 초기화
  const resetForm = () => {
    setCurrentQuestion(null);
    setQuestionId('');
    setQuestionCategory('');
    setQuestionText('');
    setQuestionType('single_choice');
    setQuestionOptions('');
    setIsRequired(true);
    setEditMode(false);
  };

  // 질문 타입에 따른 옵션 플레이스홀더
  const getOptionsPlaceholder = () => {
    switch (questionType) {
      case 'single_choice':
        return '선택지를 콤마로 구분하여 입력 (예: 매우 그렇다,그렇다,보통,아니다,매우 아니다)';
      case 'multiple_choice':
        return '선택지를 콤마로 구분하여 입력 (예: 사과,바나나,오렌지,포도)';
      case 'scale_5':
        return '1-5 척도 항목 (자동 생성)';
      case 'scale_7':
        return '1-7 척도 항목 (자동 생성)';
      case 'text':
        return '텍스트 입력 필드 (옵션 불필요)';
      default:
        return '';
    }
  };

  // 질문 타입에 따른 기본 옵션 설정
  const getDefaultOptions = () => {
    switch (questionType) {
      case 'scale_5':
        return '1,2,3,4,5';
      case 'scale_7':
        return '1,2,3,4,5,6,7';
      case 'text':
        return '';
      default:
        return questionOptions;
    }
  };

  // 문항 추가
  const handleAddQuestion = async () => {
    if (!questionId.trim() || !questionText.trim() || (!['text'].includes(questionType) && !questionOptions.trim())) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    try {
      const options = ['scale_5', 'scale_7', 'text'].includes(questionType) 
        ? getDefaultOptions() 
        : questionOptions.trim();

      const { data, error } = await supabase
        .from('questions')
        .insert([{ 
          survey_set_id: surveySet.id,
          question_id: questionId.trim(),
          question_category: questionCategory.trim(),
          question_text: questionText.trim(),
          question_type: questionType,
          options: options,
          is_required: isRequired
        }])
        .select();

      if (error) throw error;
      onQuestionChange(data[0], 'add');
      handleFormDialogClose();
    } catch (error) {
      console.error('문항 추가 중 오류 발생:', error.message);
      alert(`문항 추가 실패: ${error.message}`);
    }
  };

  // 문항 수정
  const handleUpdateQuestion = async () => {
    if (!questionId.trim() || !questionText.trim() || (!['text'].includes(questionType) && !questionOptions.trim())) {
      alert('필수 필드를 모두 입력해주세요.');
      return;
    }

    if (!currentQuestion) return;

    try {
      const options = ['scale_5', 'scale_7', 'text'].includes(questionType) 
        ? getDefaultOptions() 
        : questionOptions.trim();

      const { data, error } = await supabase
        .from('questions')
        .update({ 
          question_id: questionId.trim(),
          question_category: questionCategory.trim(),
          question_text: questionText.trim(),
          question_type: questionType,
          options: options,
          is_required: isRequired
        })
        .eq('id', currentQuestion.id)
        .select();

      if (error) throw error;
      onQuestionChange(data[0], 'update');
      handleFormDialogClose();
    } catch (error) {
      console.error('문항 수정 중 오류 발생:', error.message);
      alert(`문항 수정 실패: ${error.message}`);
    }
  };

  // 문항 삭제
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionToDelete.id);

      if (error) throw error;
      onQuestionChange(questionToDelete, 'delete');
      handleDeleteDialogClose();
    } catch (error) {
      console.error('문항 삭제 중 오류 발생:', error.message);
      alert(`문항 삭제 실패: ${error.message}`);
      handleDeleteDialogClose();
    }
  };

  // 질문 유형 라벨 가져오기
  const getQuestionTypeLabel = (type) => {
    const typeObj = QUESTION_TYPES.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {surveySet.name} - 문항 목록
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          문항 추가
        </Button>
      </Box>

      {/* 문항 추가/수정 다이얼로그 */}
      <Dialog 
        open={formDialogOpen} 
        onClose={handleFormDialogClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editMode ? '문항 수정' : '새 문항 추가'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="문항 ID"
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                fullWidth
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label="카테고리"
                value={questionCategory}
                onChange={(e) => setQuestionCategory(e.target.value)}
                fullWidth
                sx={{ flex: 2 }}
              />
            </Box>
            
            <TextField
              label="질문 내용"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl fullWidth sx={{ flex: 2 }}>
                <InputLabel id="question-type-label">질문 유형</InputLabel>
                <Select
                  labelId="question-type-label"
                  value={questionType}
                  label="질문 유형"
                  onChange={(e) => {
                    setQuestionType(e.target.value);
                    if (['scale_5', 'scale_7', 'text'].includes(e.target.value)) {
                      setQuestionOptions(getDefaultOptions());
                    }
                  }}
                >
                  {QUESTION_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch 
                    checked={isRequired} 
                    onChange={(e) => setIsRequired(e.target.checked)} 
                  />
                }
                label="필수 문항"
                sx={{ flex: 1 }}
              />
            </Box>

            {questionType !== 'text' && (
              <TextField
                label="선택지"
                value={questionOptions}
                onChange={(e) => setQuestionOptions(e.target.value)}
                fullWidth
                required={!['scale_5', 'scale_7', 'text'].includes(questionType)}
                multiline
                rows={2}
                placeholder={getOptionsPlaceholder()}
                disabled={['scale_5', 'scale_7', 'text'].includes(questionType)}
                helperText={['scale_5', 'scale_7', 'text'].includes(questionType) ? 
                  "이 질문 유형은 옵션이 자동으로 설정됩니다." : 
                  "선택지를 콤마(,)로 구분하여 입력하세요."}
              />
            )}

            {questionType !== 'text' && questionOptions && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  미리보기:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {questionOptions.split(',').map((option, index) => (
                    <Chip 
                      key={index} 
                      label={option.trim()} 
                      variant="outlined" 
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFormDialogClose}>취소</Button>
          <Button 
            onClick={editMode ? handleUpdateQuestion : handleAddQuestion} 
            variant="contained"
          >
            {editMode ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="문항 목록 테이블">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>질문 내용</TableCell>
              <TableCell>질문 유형</TableCell>
              <TableCell>선택지</TableCell>
              <TableCell>필수 여부</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.length > 0 ? (
              questions.map((question) => (
                <TableRow
                  key={question.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{question.question_id}</TableCell>
                  <TableCell>{question.question_category}</TableCell>
                  <TableCell>{question.question_text}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getQuestionTypeLabel(question.question_type)} 
                      size="small"
                      color={
                        question.question_type === 'single_choice' ? 'primary' :
                        question.question_type === 'multiple_choice' ? 'secondary' :
                        question.question_type === 'scale_5' || question.question_type === 'scale_7' ? 'info' :
                        'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {question.question_type !== 'text' ? (
                      <Box sx={{ maxWidth: 200, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {question.options}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {question.is_required ? (
                      <Chip label="필수" size="small" color="error" />
                    ) : (
                      <Chip label="선택" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="수정">
                      <IconButton 
                        aria-label="edit"
                        onClick={() => handleEditClick(question)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton 
                        aria-label="delete"
                        onClick={() => handleDeleteClick(question)}
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
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      등록된 문항이 없습니다.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      startIcon={<AddIcon />}
                      onClick={handleAddClick}
                      sx={{ mt: 1 }}
                    >
                      첫 문항 추가하기
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog 
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteQuestion}
        title="문항 삭제"
        message={`'${questionToDelete?.question_text}' 문항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        severity="error"
      />
    </>
  );
} 