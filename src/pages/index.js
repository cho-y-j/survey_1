import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Divider
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon
} from '@mui/icons-material';
import Link from 'next/link';
import Head from 'next/head';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    companies: 0,
    surveySets: 0,
    distributions: 0,
    responses: 0
  });
  const [dbStatus, setDbStatus] = useState('checking');
  const [recentActivity, setRecentActivity] = useState([]);
  const [distributionData, setDistributionData] = useState([]);

  useEffect(() => {
    checkConnection();
    fetchStats();
    fetchRecentActivity();
  }, []);

  // Supabase 연결 상태 확인
  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      setDbStatus('connected');
    } catch (error) {
      console.error('Database connection error:', error);
      setDbStatus('error');
    }
  };

  // 통계 데이터 가져오기
  const fetchStats = async () => {
    try {
      const [
        { count: companiesCount },
        { count: surveySetsCount },
        { count: distributionsCount },
        { count: responsesCount }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('survey_sets').select('*', { count: 'exact', head: true }),
        supabase.from('survey_distributions').select('*', { count: 'exact', head: true }),
        supabase.from('responses').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        companies: companiesCount,
        surveySets: surveySetsCount,
        distributions: distributionsCount,
        responses: responsesCount
      });

      // 배포 상태 데이터 가져오기
      const { data: distributions } = await supabase
        .from('survey_distributions')
        .select('status')
        .order('created_at', { ascending: false });

      if (distributions) {
        const statusCounts = distributions.reduce((acc, dist) => {
          acc[dist.status] = (acc[dist.status] || 0) + 1;
          return acc;
        }, {});

        setDistributionData([
          { name: '진행중', value: statusCounts['active'] || 0 },
          { name: '완료됨', value: statusCounts['completed'] || 0 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // 최근 활동 가져오기
  const fetchRecentActivity = async () => {
    try {
      // 최근 응답 데이터
      const { data: recentResponses } = await supabase
        .from('responses')
        .select('id, submitted_at, survey_distribution_id')
        .order('submitted_at', { ascending: false })
        .limit(5);

      // 최근 배포 데이터
      const { data: recentDistributions } = await supabase
        .from('survey_distributions')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // 통합 활동 로그 생성
      const activities = [
        ...(recentResponses || []).map(response => ({
          type: 'response',
          id: response.id,
          title: '새 응답이 제출됨',
          date: response.submitted_at,
          link: `/results/${response.survey_distribution_id}`
        })),
        ...(recentDistributions || []).map(dist => ({
          type: 'distribution',
          id: dist.id,
          title: `'${dist.title}' 설문 배포`,
          date: dist.created_at,
          link: `/admin/results`
        }))
      ];

      // 날짜 기준 정렬
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setRecentActivity(activities.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // 샘플 차트 데이터
  const sampleLineData = [
    { name: '1월', value: 65 },
    { name: '2월', value: 59 },
    { name: '3월', value: 80 },
    { name: '4월', value: 81 },
    { name: '5월', value: 56 },
    { name: '6월', value: 55 },
    { name: '7월', value: 40 },
  ];

  // 날짜 형식화
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminLayout title="대시보드">
      <Head>
        <title>대시보드 | 설문 조사 시스템</title>
      </Head>

      {/* 상태 표시 */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip
                label={`Supabase ${dbStatus === 'connected' ? '연결됨' : '연결 오류'}`}
                color={dbStatus === 'connected' ? 'success' : 'error'}
            size="small"
              />
          <Chip label="Next.js" color="primary" size="small" />
          <Chip label="OpenAI" color="secondary" size="small" />
            </Stack>
          </Box>

          {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    등록된 회사
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                    {stats.companies}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    설문셋
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                    {stats.surveySets}
                  </Typography>
                </Box>
                <QuestionAnswerIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
              </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    배포된 설문
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                    {stats.distributions}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    총 응답 수
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                    {stats.responses}
                  </Typography>
                </Box>
                <AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

      {/* 차트 및 활동 내역 */}
      <Grid container spacing={3}>
        {/* 왼쪽 컬럼: 차트 */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">응답 추이</Typography>
                </Box>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sampleLineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} name="응답 수" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BarChartIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">회사별 설문 수</Typography>
                </Box>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'A사', value: 20 },
                      { name: 'B사', value: 15 },
                      { name: 'C사', value: 10 },
                      { name: 'D사', value: 5 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" name="설문 수" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PieChartIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">설문 상태</Typography>
                </Box>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
        
        {/* 오른쪽 컬럼: 최근 활동 및 바로가기 */}
            <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
              최근 활동
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <Box key={activity.id} sx={{ mb: index < recentActivity.length - 1 ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {activity.title}
                    </Typography>
                    <Chip 
                      label={activity.type === 'response' ? '응답' : '배포'} 
                      size="small"
                      color={activity.type === 'response' ? 'success' : 'info'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(activity.date)}
                  </Typography>
                  
                  {index < recentActivity.length - 1 && <Divider sx={{ mt: 1.5, mb: 1.5 }} />}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                최근 활동이 없습니다.
                </Typography>
            )}
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              바로가기
                </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
                <Button 
                  component={Link}
                  href="/admin/surveys"
                  variant="outlined"
                  fullWidth
                startIcon={<QuestionAnswerIcon />}
                >
                설문 관리
                </Button>
                <Button 
                  component={Link}
                  href="/admin/distribute"
                  variant="outlined"
                  fullWidth
                startIcon={<PeopleIcon />}
                >
                설문 배포
                </Button>
                <Button 
                  component={Link}
                  href="/admin/results"
                  variant="outlined"
                  fullWidth
                startIcon={<AssessmentIcon />}
              >
                결과 분석
              </Button>
              <Button 
                component={Link}
                href="/results"
                variant="contained"
                fullWidth
                color="primary"
                startIcon={<BarChartIcon />}
              >
                분석 대시보드
                </Button>
            </Stack>
              </Paper>
            </Grid>
          </Grid>
    </AdminLayout>
  );
} 