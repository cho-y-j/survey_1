import { Alert, AlertTitle, Box, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function ErrorAlert({ 
  title = '오류 발생', 
  message = '데이터를 불러오는 중 오류가 발생했습니다.',
  onRetry = null 
}) {
  return (
    <Box sx={{ margin: 2 }}>
      <Alert 
        severity="error"
        action={
          onRetry && (
            <Button 
              color="inherit" 
              size="small" 
              onClick={onRetry}
              startIcon={<RefreshIcon />}
            >
              재시도
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
} 