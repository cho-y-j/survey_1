import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingSpinner({ message = '로딩 중...' }) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 3,
        minHeight: '200px'
      }}
    >
      <CircularProgress size={60} thickness={4} />
      {message && (
        <Typography variant="body1" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
} 