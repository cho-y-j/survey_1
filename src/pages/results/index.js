import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';
import Head from 'next/head';
import SearchIcon from '@mui/icons-material/Search';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ResultsOverviewPage() {
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalResponses: 0,
    averageCompletionRate: 0,
    statusCounts: {},
    dailyResponses: [],
  });
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(distributions.map(d => d.question_category || '미분류'))];
    return ['전체', ...uniqueCategories];
  }, [distributions]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    console.log('필터링된 문항:', distributions);
    console.log('카테고리 목록:', categories);
    console.log('카테고리별 문항 수:', categories.map(cat => ({
      category: cat,
      count: distributions.filter(d => (d.question_category || '미분류') === (cat === '전체' ? d.question_category : cat)).length
    })));
  }, [distributions, categories]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 설문 배포 데이터 조회
      const { data: distributionsData, error: distributionsError } = await supabase
        .from('survey_distributions')
        .select(`
          *,
          company:companies(name),
          responses:responses(count)
        `)
        .order('created_at', { ascending: false });

      if (distributionsError) throw distributionsError;

      setDistributions(distributionsData);

      // 통계 계산
      const totalResponses = distributionsData.reduce((sum, dist) => sum + (dist.current_responses || 0), 0);
      const completionRates = distributionsData.map(dist => 
        (dist.current_responses / dist.target_participants) * 100
      );
      const averageCompletionRate = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;

      // 상태별 카운트
      const statusCounts = distributionsData.reduce((acc, dist) => {
        acc[dist.status] = (acc[dist.status] || 0) + 1;
        return acc;
      }, {});

      // 일별 응답 수 계산
      const dailyResponses = distributionsData.reduce((acc, dist) => {
        const date = format(new Date(dist.created_at), 'yyyy-MM-dd');
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.responses += dist.current_responses || 0;
        } else {
          acc.push({ date, responses: dist.current_responses || 0 });
        }
        return acc;
      }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

      setStats({
        totalResponses,
        averageCompletionRate,
        statusCounts,
        dailyResponses,
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '날짜 없음';
    return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko });
  };

  // 무한 스크롤을 위한 데이터 필터링
  const filteredDistributions = useMemo(() => {
    return distributions.filter(dist => {
    const matchesSearch = dist.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (dist.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || dist.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  }, [distributions, searchTerm, filterStatus]);

  // 현재 페이지의 데이터
  const currentPageData = useMemo(() => {
    return filteredDistributions.slice(0, (page + 1) * PAGE_SIZE);
  }, [filteredDistributions, page]);

  // 더 많은 데이터 로드
  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = page + 1;
      const hasMoreData = nextPage * PAGE_SIZE < filteredDistributions.length;
      
      setPage(nextPage);
      setHasMore(hasMoreData);
      setLoadingMore(false);
    }, 500);
  }, [page, filteredDistributions.length, loadingMore]);

  const getCompletionRate = (dist) => {
    return ((dist.current_responses / dist.target_participants) * 100).toFixed(1);
  };

  const renderDistributionCard = (dist) => (
    <Grid item xs={12} md={6} lg={4} key={dist.id}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
          }
        }}
      >
        <Typography variant="h6" gutterBottom noWrap>
          {dist.title}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {dist.company?.name || '회사 없음'}
        </Typography>
        
        <Box sx={{ my: 2, flexGrow: 1 }}>
          <Typography variant="body2" gutterBottom>
            응답률
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ flexGrow: 1, mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, (dist.current_responses / dist.target_participants) * 100)}
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getCompletionRate(dist) >= 100 ? '#4caf50' : '#1976d2'
                  }
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {getCompletionRate(dist)}%
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2">
              {dist.current_responses}/{dist.target_participants} 응답
            </Typography>
            <Chip
              label={dist.status === 'active' ? '진행중' : '완료됨'}
              color={dist.status === 'active' ? 'success' : 'info'}
              size="small"
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="caption" color="text.secondary">
            {formatDate(dist.created_at)}
          </Typography>
          <Button 
            variant="contained"
            size="small"
            component={Link}
            href={`/results/dist/items?distributionId=${dist.id}`}
            startIcon={<AnalyticsIcon />}
          >
            상세 분석
          </Button>
        </Box>
      </Paper>
    </Grid>
  );

  if (loading) {
    return (
      <AdminLayout title="설문 분석 대시보드">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="설문 분석 대시보드">
        <Alert severity="error" sx={{ mt: 2 }}>
          데이터를 불러오는 중 오류가 발생했습니다: {error}
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="설문 분석 대시보드">
      <Head>
        <title>설문 분석 대시보드 | 설문 시스템</title>
      </Head>

      {/* 요약 통계 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom>총 응답 수</Typography>
            <Typography variant="h4" color="primary" fontWeight="bold">{stats.totalResponses}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom>평균 완료율</Typography>
            <Typography variant="h4" color="secondary" fontWeight="bold">
              {stats.averageCompletionRate.toFixed(1)}%
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom>진행중인 설문</Typography>
            <Typography variant="h4" color="success.main" fontWeight="bold">
              {stats.statusCounts['active'] || 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom>완료된 설문</Typography>
            <Typography variant="h4" color="info.main" fontWeight="bold">
              {stats.statusCounts['completed'] || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 분석 차트 */}
      <Paper sx={{ mb: 4, p: 0, borderRadius: '10px', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab icon={<AnalyticsIcon />} iconPosition="start" label="전체 분석" />
            <Tab icon={<ShowChartIcon />} iconPosition="start" label="트렌드 분석" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
        {tabValue === 0 && (
            <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>일별 응답 추이</Typography>
            <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                    <AreaChart data={stats.dailyResponses}>
                      <defs>
                        <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="responses" 
                        stroke="#8884d8" 
                        fillOpacity={1}
                        fill="url(#colorResponses)"
                        name="응답 수" 
                      />
                    </AreaChart>
              </ResponsiveContainer>
            </Box>
        </Grid>
        <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>설문 상태 분포</Typography>
            <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: '진행중', value: stats.statusCounts['active'] || 0 },
                      { name: '완료됨', value: stats.statusCounts['completed'] || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                        innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                        paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.entries(stats.statusCounts).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
        </Grid>
      </Grid>
        )}

        {tabValue === 1 && (
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={distributions.slice(0, 10)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="title" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar name="목표 응답 수" dataKey="target_participants" fill="#8884d8" />
                  <Bar name="현재 응답 수" dataKey="current_responses" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
          </Box>
      </Paper>

      {/* 검색 및 필터 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="설문 또는 회사 검색"
                value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
          sx={{ flexGrow: 1, maxWidth: 300 }}
              />
              
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>상태</InputLabel>
                <Select
                  value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">진행중</MenuItem>
                  <MenuItem value="completed">완료됨</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
      {/* 설문 목록 (무한 스크롤) */}
      <div id="scrollableDiv" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
        <InfiniteScroll
          dataLength={currentPageData.length}
          next={loadMore}
          hasMore={hasMore}
          loader={<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}
          scrollableTarget="scrollableDiv"
        >
          <Grid container spacing={3}>
            {currentPageData.map(renderDistributionCard)}
          </Grid>
        </InfiniteScroll>
      </div>
    </AdminLayout>
  );
} 