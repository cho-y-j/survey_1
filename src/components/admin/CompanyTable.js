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
  DialogActions,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  InputAdornment,
  OutlinedInput,
  Stack,
  Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BusinessIcon from '@mui/icons-material/Business';
import { supabase } from '@/utils/supabase';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function CompanyTable({ companies, onCompanyChange }) {
  const [editMode, setEditMode] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [distributions, setDistributions] = useState([]);
  const [loadingDistributions, setLoadingDistributions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0
  });

  // 최초 로드 시 첫 번째 회사를 자동 선택
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      handleViewDetails(companies[0]);
    }
  }, [companies]);

  // 검색어에 따른 필터링된 회사 목록
  const filteredCompanies = companies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.description && company.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 회사 상세 정보 패널 열기
  const handleViewDetails = async (company) => {
    setSelectedCompany(company);
    setLoadingDistributions(true);
    
    try {
      // 해당 회사에 대한 설문 배포 목록 가져오기
      const { data, error } = await supabase
        .from('survey_distributions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDistributions(data || []);
      
      // 통계 계산
      const active = data ? data.filter(d => d.status === 'active').length : 0;
      const completed = data ? data.filter(d => d.status === 'completed').length : 0;
      
      setStats({
        total: data ? data.length : 0,
        active,
        completed
      });
    } catch (error) {
      console.error('설문 배포 데이터 조회 중 오류 발생:', error.message);
    } finally {
      setLoadingDistributions(false);
    }
  };

  // 탭 변경 처리
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // 다이얼로그 열기
  const handleAddClick = () => {
    setEditMode(false);
    setCompanyName('');
    setCompanyDescription('');
    setDialogOpen(true);
  };

  // 수정 모드 열기
  const handleEditClick = (company) => {
    setEditMode(true);
    setCurrentCompany(company);
    setCompanyName(company.name);
    setCompanyDescription(company.description || '');
    setDialogOpen(true);
  };

  // 다이얼로그 닫기
  const handleDialogClose = () => {
    setDialogOpen(false);
    setCompanyName('');
    setCompanyDescription('');
    setCurrentCompany(null);
    setEditMode(false);
  };

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  // 삭제 다이얼로그 닫기
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setCompanyToDelete(null);
  };

  // 회사 추가
  const handleAddCompany = async () => {
    if (!companyName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{ 
          name: companyName.trim(), 
          description: companyDescription.trim() 
        }])
        .select();

      if (error) throw error;
      onCompanyChange(data[0], 'add');
      handleDialogClose();
    } catch (error) {
      console.error('회사 추가 중 오류 발생:', error.message);
      alert(`회사 추가 실패: ${error.message}`);
    }
  };

  // 회사 수정
  const handleUpdateCompany = async () => {
    if (!companyName.trim() || !currentCompany) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .update({ 
          name: companyName.trim(),
          description: companyDescription.trim()
        })
        .eq('id', currentCompany.id)
        .select();

      if (error) throw error;
      onCompanyChange({
        ...currentCompany,
        name: companyName.trim(),
        description: companyDescription.trim()
      }, 'update');
      handleDialogClose();
    } catch (error) {
      console.error('회사 수정 중 오류 발생:', error.message);
      alert(`회사 수정 실패: ${error.message}`);
    }
  };

  // 회사 삭제
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyToDelete.id);

      if (error) throw error;
      onCompanyChange(companyToDelete, 'delete');
      handleDeleteDialogClose();
      
      // 선택된 회사가 삭제된 회사와 같으면 선택 해제
      if (selectedCompany && selectedCompany.id === companyToDelete.id) {
        setSelectedCompany(null);
      }
    } catch (error) {
      console.error('회사 삭제 중 오류 발생:', error.message);
      alert(`회사 삭제 실패: ${error.message}`);
      handleDeleteDialogClose();
    }
  };

  // 배포 상태에 따른 색상 반환
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success.main';
      case 'completed': return 'info.main';
      case 'cancelled': return 'error.main';
      default: return 'text.primary';
    }
  };

  return (
    <>
      {/* 상단 검색 및 버튼 영역 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <OutlinedInput
          placeholder="회사명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          sx={{ mr: 2, maxWidth: 'calc(100% - 140px)' }}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          }
        />
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          새 회사 등록
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* 좌측: 회사 목록 */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <Box
                  key={company.id}
                  sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    backgroundColor: selectedCompany?.id === company.id ? 'action.selected' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&:last-child': {
                      borderBottom: 'none',
                    }
                  }}
                  onClick={() => handleViewDetails(company)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {company.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                        {company.description || '설명 없음'}
                      </Typography>
                    </Box>
                    <Box>
                      <Tooltip title="수정">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(company);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(company);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mt: 1,
                      color: 'text.secondary',
                      fontSize: '0.75rem'
                    }}
                  >
                    <Chip 
                      label={`참여중 ${Math.floor(Math.random() * 5)}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={`완료 ${Math.floor(Math.random() * 10)}`} 
                      size="small" 
                      color="success" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {searchTerm ? '검색 결과가 없습니다.' : '등록된 회사가 없습니다.'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* 우측: 회사 상세 정보 */}
        <Grid item xs={12} md={8}>
          {selectedCompany ? (
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h5">
                        {selectedCompany.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        등록일: {new Date(selectedCompany.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditClick(selectedCompany)}
                      sx={{ mr: 1 }}
                    >
                      정보 수정
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(selectedCompany)}
                    >
                      삭제
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                      <CardContent>
                        <Typography variant="h3" align="center">
                          {stats.total}
                        </Typography>
                        <Typography variant="body2" align="center">
                          총 설문 수
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <CardContent>
                        <Typography variant="h3" align="center">
                          {stats.active}
                        </Typography>
                        <Typography variant="body2" align="center">
                          진행중인 설문
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                      <CardContent>
                        <Typography variant="h3" align="center">
                          {stats.completed}
                        </Typography>
                        <Typography variant="body2" align="center">
                          완료된 설문
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    회사 설명
                  </Typography>
                  <Typography paragraph>
                    {selectedCompany.description || '설명이 없습니다.'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    최근 설문
                  </Typography>

                  {loadingDistributions ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : distributions.length > 0 ? (
                    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>설문명</TableCell>
                            <TableCell>상태</TableCell>
                            <TableCell>응답률</TableCell>
                            <TableCell>기간</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {distributions.slice(0, 5).map((distribution) => (
                            <TableRow key={distribution.id}>
                              <TableCell>
                                2023년 직원 만족도 조사
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={distribution.status} 
                                  size="small" 
                                  color={
                                    distribution.status === 'active' ? 'success' : 
                                    distribution.status === 'completed' ? 'info' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {Math.floor(Math.random() * 100)}%
                              </TableCell>
                              <TableCell>
                                {new Date(distribution.created_at).toLocaleDateString()} ~ 
                                {new Date(new Date(distribution.created_at).getTime() + 14*24*60*60*1000).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  ) : (
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      설문 배포 이력이 없습니다.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Paper variant="outlined" sx={{ height: '100%', borderRadius: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
              <Typography color="text.secondary">
                좌측에서 회사를 선택하세요.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editMode ? '회사 정보 수정' : '새 회사 추가'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="회사명"
            type="text"
            fullWidth
            variant="outlined"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="description"
            label="회사 설명"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={companyDescription}
            onChange={(e) => setCompanyDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            취소
          </Button>
          <Button 
            onClick={editMode ? handleUpdateCompany : handleAddCompany} 
            variant="contained"
            disabled={!companyName.trim()}
          >
            {editMode ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog 
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteCompany}
        title="회사 삭제"
        message={`'${companyToDelete?.name}' 회사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        severity="error"
      />
    </>
  );
} 