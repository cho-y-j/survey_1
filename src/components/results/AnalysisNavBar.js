import React from 'react';
import { Box, Button, Tooltip, Typography, Chip, Divider } from '@mui/material';
import Link from 'next/link';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import GroupIcon from '@mui/icons-material/Group';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BusinessIcon from '@mui/icons-material/Business';

const AnalysisNavBar = ({ distributionId, surveySetId, currentPage, distribution }) => {
  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#f5f5f5',
      p: 2,
      borderRadius: 2,
      mb: 3,
      boxShadow: '0px 2px 4px rgba(0,0,0,0.05)'
    }}>
      {/* 회사 정보 및 배포 정보 섹션 */}
      {distribution && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              {distribution.company?.name || '미지정 회사'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            <Chip 
              size="small"
              label={`설문: ${distribution.title || '제목 없음'}`} 
              variant="outlined" 
            />
            <Chip 
              size="small"
              label={`상태: ${distribution.status === 'active' ? '진행중' : '완료'}`} 
              color={distribution.status === 'active' ? 'success' : 'info'} 
              variant="outlined" 
            />
            <Chip 
              size="small"
              label={`응답: ${distribution.current_responses || 0}/${distribution.target_participants || 0}`} 
              variant="outlined" 
            />
          </Box>
        </Box>
      )}
      
      <Divider sx={{ mb: 2 }} />
      
      {/* 내비게이션 버튼 섹션 */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 2, 
        justifyContent: 'space-between',
        width: '100%'
      }}>
        <Tooltip title="문항별 및 카테고리별 기본 분석">
          <Button
            component={Link}
            href={`/results/dist/items?distributionId=${distributionId}&surveySetId=${surveySetId}`}
            variant={currentPage === 'items' ? "contained" : "outlined"}
            size="medium"
            startIcon={<AssessmentIcon />}
            sx={{ flex: 1 }}
          >
            문항/카테고리 분석
          </Button>
        </Tooltip>
        
        <Tooltip title="카테고리 간 관계 분석">
          <Button
            component={Link}
            href={`/results/dist/categories?distributionId=${distributionId}&surveySetId=${surveySetId}`}
            variant={currentPage === 'categories' ? "contained" : "outlined"}
            size="medium"
            startIcon={<CategoryIcon />}
            sx={{ flex: 1 }}
          >
            카테고리 교차
          </Button>
        </Tooltip>
        
        <Tooltip title="설문셋 간 데이터 비교 분석">
          <Button
            component={Link}
            href={`/results/dist/cross-category?distributionId=${distributionId}&surveySetId=${surveySetId}`}
            variant={currentPage === 'cross' ? "contained" : "outlined"}
            size="medium"
            startIcon={<CompareArrowsIcon />}
            sx={{ flex: 1 }}
          >
            설문셋 교차
          </Button>
        </Tooltip>
        
        <Tooltip title="인구통계 기반 응답 패턴 분석">
          <Button
            component={Link}
            href={`/results/dist/demographics?distributionId=${distributionId}`}
            variant={currentPage === 'demographics' ? "contained" : "outlined"}
            size="medium"
            startIcon={<GroupIcon />}
            sx={{ flex: 1 }}
          >
            인구통계 분석
          </Button>
        </Tooltip>
        
        <Tooltip title="변수 간 상관관계 심층 분석">
          <Button
            component={Link}
            href={`/results/dist/correlations?distributionId=${distributionId}`}
            variant={currentPage === 'correlations' ? "contained" : "outlined"}
            size="medium"
            startIcon={<AnalyticsIcon />}
            sx={{ flex: 1 }}
          >
            상관관계 분석
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default AnalysisNavBar; 