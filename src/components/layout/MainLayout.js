import { Box, Container } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import Head from 'next/head';

export default function MainLayout({ children, title = '설문 조사 시스템', hideHeader = false }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Next.js와 Supabase를 활용한 설문 조사 시스템" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {!hideHeader && <Header title={title} />}
        <Container component="main" sx={{ 
          flexGrow: 1, 
          py: hideHeader ? 0 : 4, 
          mt: hideHeader ? 0 : 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </Container>
        <Footer />
      </Box>
    </>
  );
} 