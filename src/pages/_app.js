import '@/styles/globals.css';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import theme from '../styles/theme';

export default function App({ Component, pageProps }) {
  // 한국어 로케일 설정
  dayjs.locale('ko');
  
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <CssBaseline />
        <Component {...pageProps} />
      </LocalizationProvider>
    </ThemeProvider>
  );
}
