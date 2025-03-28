import { useState } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Divider, 
  Chip, 
  Button, 
  IconButton, 
  Tooltip,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  ButtonGroup,
  Stack,
  TableCell,
  Table,
  TableHead,
  TableBody,
  TableRow
} from '@mui/material';
import { supabase } from '@/utils/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 진행 상태 색상
const STATUS_COLORS = {
  active: '#4caf50',
  completed: '#2196f3',
  paused: '#ff9800',
  stopped: '#f44336',
  expired: '#9e9e9e'
};

// 차트 색상
const PROGRESS_COLORS = ['#4caf50', '#e0e0e0'];

export default function DistributionList({ distributions, onRefresh }) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState(null);

  // 상세 정보 다이얼로그 열기
  const handleDetailClick = (distribution) => {
    setSelectedDistribution(distribution);
    setDetailDialogOpen(true);
  };

  // 상세 정보 다이얼로그 닫기
  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedDistribution(null);
  };

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (e, distribution) => {
    e.stopPropagation();
    setDistributionToDelete(distribution);
    setDeleteDialogOpen(true);
  };

  // 삭제 다이얼로그 닫기
  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    setDistributionToDelete(null);
  };

  // 설문 상태 변경 (일시정지/재시작)
  const handleTogglePause = async (e, distribution) => {
    e.stopPropagation();
    try {
      const newStatus = distribution.status === 'paused' ? 'active' : 'paused';
      
      const { error } = await supabase
        .from('survey_distributions')
        .update({ status: newStatus })
        .eq('id', distribution.id);
      
      if (error) throw error;
      
      // 데이터 새로고침
      onRefresh();
    } catch (error) {
      console.error('설문 상태 변경 오류:', error.message);
      alert(`설문 상태 변경 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 설문 강제 종료
  const handleStop = async (e, distribution) => {
    e.stopPropagation();
    if (!confirm('설문을 강제로 종료하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      const { error } = await supabase
        .from('survey_distributions')
        .update({ status: 'stopped' })
        .eq('id', distribution.id);
      
      if (error) throw error;
      
      // 데이터 새로고침
      onRefresh();
    } catch (error) {
      console.error('설문 종료 오류:', error.message);
      alert(`설문 종료 중 오류가 발생했습니다: ${error.message}`);
    }
  };
  
  // 설문 삭제
  const handleDeleteDistribution = async () => {
    if (!distributionToDelete) return;
    
    try {
      // 응답 데이터 삭제
      const { error: responsesError } = await supabase
        .from('responses')
        .delete()
        .eq('survey_distribution_id', distributionToDelete.id);
      
      if (responsesError) throw responsesError;
      
      // 설문 배포 데이터 삭제
      const { error } = await supabase
        .from('survey_distributions')
        .delete()
        .eq('id', distributionToDelete.id);
      
      if (error) throw error;
      
      // 다이얼로그 닫기
      handleCloseDelete();
      
      // 데이터 새로고침
      onRefresh();
    } catch (error) {
      console.error('설문 삭제 오류:', error.message);
      alert(`설문 삭제 중 오류가 발생했습니다: ${error.message}`);
      handleCloseDelete();
    }
  };

  // 진행률 계산
  const calculateProgress = (currentResponses, targetParticipants) => {
    if (!targetParticipants || targetParticipants <= 0) return 0;
    const progress = (currentResponses / targetParticipants) * 100;
    return Math.min(progress, 100); // 최대 100%로 제한
  };

  // 파이 차트 데이터 생성
  const createPieData = (currentResponses, targetParticipants) => {
    const completed = currentResponses || 0;
    const remaining = Math.max(0, targetParticipants - completed);
    
    return [
      { name: '완료', value: completed },
      { name: '미완료', value: remaining }
    ];
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    if (!dateString) return '날짜 없음';
    return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  };

  // 남은 일수 계산
  const calculateRemainingDays = (endDateString) => {
    if (!endDateString) return '정보 없음';
    
    const endDate = new Date(endDateString);
    const currentDate = new Date();
    const differenceInTime = endDate.getTime() - currentDate.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    
    if (differenceInDays < 0) return '만료됨';
    if (differenceInDays === 0) return '오늘 만료';
    return `${differenceInDays}일 남음`;
  };

  // 상태 표시용 칩 색상 결정
  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || '#757575';
  };

  // 상태 텍스트 변환
  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '진행중';
      case 'completed': return '완료됨';
      case 'paused': return '일시정지';
      case 'stopped': return '강제종료';
      case 'expired': return '만료됨';
      default: return status;
    }
  };

  // 링크 복사
  const copyLink = (distribution) => {
    navigator.clipboard.writeText(distribution.url);
    alert('링크가 클립보드에 복사되었습니다.');
  };

  // 미리보기 열기
  const openPreview = (distribution) => {
    window.open(distribution.url, '_blank');
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={onRefresh}
          size="small"
        >
          새로고침
        </Button>
      </Box>

      {distributions.length === 0 ? (
        <Typography variant="body1" align="center" sx={{ py: 4 }}>
          배포된 설문이 없습니다.
        </Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>헤더</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distributions.map((distribution, index) => {
              const progress = calculateProgress(
                distribution.current_responses || 0, 
                distribution.target_participants || 100
              );
              
              return (
                <TableRow key={distribution.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', width: '100%', mb: 1, justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h6" component="div">
                          {distribution.title || '제목 없음'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {distribution.company?.name || '회사 정보 없음'} | {formatDate(distribution.created_at)}
                        </Typography>
                      </Box>
                      <Box>
                        <Chip 
                          label={getStatusText(distribution.status)}
                          size="small"
                          sx={{ 
                            backgroundColor: getStatusColor(distribution.status),
                            color: 'white'
                          }}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">
                            설문 세트: {distribution.survey_distribution_sets?.length || 0}개
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {distribution.url ? '설문 링크 있음' : '링크 정보 없음'}
                          </Typography>
                        </Box>
                        <Box>
                          <div>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>{distribution.current_responses}</strong> / {distribution.target_participants}
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={(distribution.current_responses / distribution.target_participants) * 100}
                              sx={{ width: '100%', height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" sx={{ mt: 0.5 }}>
                              {Math.round((distribution.current_responses / distribution.target_participants) * 100)}%
                            </Typography>
                          </div>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex' }}>
                        {/* 일시정지/재시작 버튼 (진행중 또는 일시정지 상태일 때만) */}
                        {['active', 'paused'].includes(distribution.status) && (
                          <Tooltip title={distribution.status === 'paused' ? '재시작' : '일시정지'}>
                            <IconButton 
                              onClick={(e) => handleTogglePause(e, distribution)}
                              size="small"
                              color={distribution.status === 'paused' ? 'success' : 'warning'}
                            >
                              {distribution.status === 'paused' ? 
                                <PlayArrowIcon fontSize="small" /> : 
                                <PauseIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* 강제종료 버튼 (진행중 또는 일시정지 상태일 때만) */}
                        {['active', 'paused'].includes(distribution.status) && (
                          <Tooltip title="강제종료">
                            <IconButton 
                              onClick={(e) => handleStop(e, distribution)}
                              size="small"
                              color="error"
                            >
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* 링크 복사 버튼 */}
                        <Tooltip title="링크 복사">
                          <IconButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLink(distribution);
                            }}
                            size="small"
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* 미리보기 버튼 */}
                        <Tooltip title="미리보기">
                          <IconButton 
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreview(distribution);
                            }}
                            size="small"
                            color="primary"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {/* 삭제 버튼 */}
                        <Tooltip title="삭제">
                          <IconButton 
                            onClick={(e) => handleDeleteClick(e, distribution)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* 상세 정보 다이얼로그 */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        {selectedDistribution && (
          <>
            <DialogTitle>
              {selectedDistribution.company?.name || '회사 정보 없음'}
              <Chip 
                label={getStatusText(selectedDistribution.status)}
                size="small"
                sx={{ 
                  ml: 1,
                  backgroundColor: getStatusColor(selectedDistribution.status),
                  color: 'white'
                }}
              />
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    기본 정보
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">
                      <strong>대상 회사:</strong> {selectedDistribution.company?.name || '회사 정보 없음'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>생성일:</strong> {formatDate(selectedDistribution.created_at)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>설문 상태:</strong> {getStatusText(selectedDistribution.status)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>설문 링크:</strong> {selectedDistribution.url || '링크 정보 없음'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    진행 상태
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', maxHeight: 200 }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={createPieData(selectedDistribution.current_responses || 0, selectedDistribution.target_participants || 100)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {createPieData(selectedDistribution.current_responses || 0, selectedDistribution.target_participants || 100).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PROGRESS_COLORS[index % PROGRESS_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <Typography variant="body2" align="center" gutterBottom>
                        <strong>진행률:</strong> {calculateProgress(selectedDistribution.current_responses || 0, selectedDistribution.target_participants || 100).toFixed(0)}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={calculateProgress(selectedDistribution.current_responses || 0, selectedDistribution.target_participants || 100)} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: selectedDistribution.status === 'paused' ? '#ff9800' : 
                                           selectedDistribution.status === 'stopped' ? '#f44336' : 
                                           selectedDistribution.status === 'completed' ? '#2196f3' : '#4caf50',
                          }
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    포함된 설문셋
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {selectedDistribution.survey_distribution_sets?.length > 0 ? (
                      <List dense disablePadding>
                        {selectedDistribution.survey_distribution_sets
                          .map((item, index) => (
                            <ListItem key={item.id} divider={index < selectedDistribution.survey_distribution_sets.length - 1}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                                <Chip label={index + 1} size="small" color="primary" />
                              </Box>
                              <ListItemText 
                                primary={item.survey_set?.name || '설문셋 정보 없음'} 
                              />
                            </ListItem>
                          ))
                        }
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        설문셋 정보가 없습니다.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    설문 링크
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: 'action.hover',
                    p: 2,
                    borderRadius: 1
                  }}>
                    <TextField
                      value={selectedDistribution.url || '링크 정보 없음'}
                      fullWidth
                      InputProps={{
                        readOnly: true,
                      }}
                      variant="outlined"
                      size="small"
                    />
                    <Tooltip title="링크 복사">
                      <IconButton 
                        onClick={() => copyLink(selectedDistribution)} 
                        sx={{ ml: 1 }}
                        disabled={!selectedDistribution.url}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="미리보기">
                      <IconButton 
                        onClick={() => openPreview(selectedDistribution)} 
                        color="primary" 
                        sx={{ ml: 1 }}
                        disabled={!selectedDistribution.url}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Stack direction="row" spacing={1}>
                {['active', 'paused'].includes(selectedDistribution.status) && (
                  <Button 
                    onClick={(e) => {
                      handleTogglePause(e, selectedDistribution);
                      handleCloseDetail();
                    }}
                    color={selectedDistribution.status === 'paused' ? 'success' : 'warning'}
                    variant="outlined"
                    startIcon={selectedDistribution.status === 'paused' ? <PlayArrowIcon /> : <PauseIcon />}
                  >
                    {selectedDistribution.status === 'paused' ? '재시작' : '일시정지'}
                  </Button>
                )}
                
                {['active', 'paused'].includes(selectedDistribution.status) && (
                  <Button 
                    onClick={(e) => {
                      handleStop(e, selectedDistribution);
                      handleCloseDetail();
                    }}
                    color="error"
                    variant="outlined"
                    startIcon={<StopIcon />}
                  >
                    강제종료
                  </Button>
                )}
                
                <Button 
                  onClick={(e) => {
                    handleDeleteClick(e, selectedDistribution);
                    handleCloseDetail();
                  }}
                  color="error"
                  startIcon={<DeleteIcon />}
                >
                  삭제
                </Button>
                
                <Button onClick={handleCloseDetail} autoFocus>
                  닫기
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
      >
        <DialogTitle>설문 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            '{distributionToDelete?.company?.name || "선택한 설문"}'을(를) 정말 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없으며, 모든 응답 데이터도 함께 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>취소</Button>
          <Button onClick={handleDeleteDistribution} color="error" autoFocus>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 