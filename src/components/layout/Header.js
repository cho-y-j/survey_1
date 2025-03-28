import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { useRouter } from 'next/router';

const menuItems = [
  { text: '홈', href: '/' },
  { text: '회사 관리', href: '/admin/companies' },
  { text: '설문셋 관리', href: '/admin/surveys' },
  { text: '설문 배포', href: '/admin/distribute' },
];

export default function Header({ title = '설문 조사 시스템' }) {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const isActive = (href) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* 로고 및 타이틀 - 데스크톱 */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'white',
              textDecoration: 'none',
            }}
          >
            {title}
          </Typography>

          {/* 모바일 메뉴 */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="navigation menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {menuItems.map((item) => (
                <MenuItem 
                  key={item.text} 
                  onClick={handleCloseNavMenu}
                  component={Link}
                  href={item.href}
                  selected={isActive(item.href)}
                >
                  <Typography textAlign="center">{item.text}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* 로고 및 타이틀 - 모바일 */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: 700,
              color: 'white',
              textDecoration: 'none',
            }}
          >
            {title}
          </Typography>

          {/* 데스크톱 메뉴 */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {menuItems.map((item) => (
              <Button
                key={item.text}
                component={Link}
                href={item.href}
                onClick={handleCloseNavMenu}
                sx={{ 
                  my: 2, 
                  color: 'white', 
                  display: 'block',
                  backgroundColor: isActive(item.href) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  }
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>

          {/* 로그인 버튼 */}
          <Box sx={{ flexGrow: 0 }}>
            <Button color="inherit">로그인</Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
} 