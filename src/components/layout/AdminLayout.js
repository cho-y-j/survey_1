import { useState } from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  IconButton,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ShareIcon from '@mui/icons-material/Share';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from './MainLayout';

const drawerWidth = 240;

// 메인 메뉴 아이템
const menuItems = [
  { text: '대시보드', href: '/', icon: <DashboardIcon /> },
  { text: '회사 관리', href: '/admin/companies', icon: <BusinessIcon /> },
  { text: '설문셋 관리', href: '/admin/surveys', icon: <AssignmentIcon /> },
  { text: '문항 관리', href: '/admin/questions', icon: <QuestionAnswerIcon /> },
  { text: '설문 배포', href: '/admin/distribute', icon: <ShareIcon /> },
  { text: '배포 결과', href: '/admin/results', icon: <BarChartIcon /> },
  { text: '설문 분석', href: '/results', icon: <AssessmentIcon /> },
];

export default function AdminLayout({ children, title = '관리자 페이지', description }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isActive = (href) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          관리자 메뉴
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link}
              href={item.href}
              selected={isActive(item.href)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <MainLayout title={title} hideHeader={true}>
      <Box sx={{ display: 'flex' }}>
        <Box
          component="nav"
          sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
          {/* 모바일 드로어 */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          
          {/* 데스크톱 드로어 */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        
        {/* 콘텐츠 영역 */}
        <Box
          component="main"
          sx={{ 
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${drawerWidth}px)` } 
          }}
        >
          {/* 모바일에서만 표시될 메뉴 버튼과 제목 */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div">
                {title}
              </Typography>
              {description && (
                <Typography variant="caption" component="div" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          </Box>

          {/* 데스크톱에서만 표시될 제목과 설명 */}
          <Box 
            sx={{ 
              display: { xs: 'none', md: 'block' }, 
              mb: 3,
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 2
            }}
          >
            <Typography variant="h5" component="h1" gutterBottom={!!description}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>

          {children}
        </Box>
      </Box>
    </MainLayout>
  );
} 