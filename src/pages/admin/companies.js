import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import CompanyTable from '@/components/admin/CompanyTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { Paper, Typography, Box, Alert, Snackbar } from '@mui/material';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  // 회사 데이터 가져오기
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data);
      setError(null);
    } catch (error) {
      console.error('회사 데이터 조회 중 오류 발생:', error.message);
      setError(`회사 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 회사 데이터 변경 처리
  const handleCompanyChange = (company, action) => {
    switch (action) {
      case 'add':
        setCompanies([...companies, company]);
        setSuccessMessage(`'${company.name}' 회사가 추가되었습니다.`);
        break;
      case 'update':
        setCompanies(companies.map(c => c.id === company.id ? company : c));
        setSuccessMessage(`'${company.name}' 회사 정보가 수정되었습니다.`);
        break;
      case 'delete':
        setCompanies(companies.filter(c => c.id !== company.id));
        setSuccessMessage(`'${company.name}' 회사가 삭제되었습니다.`);
        break;
      default:
        break;
    }

    // 성공 메시지 표시 후 3초 후 자동으로 사라짐
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // 성공 메시지 닫기
  const handleCloseSuccess = () => {
    setSuccessMessage('');
  };

  return (
    <AdminLayout title="회사 관리" description="설문 참여 회사를 등록하고 관리합니다. 회사를 선택하면 상세 정보와 설문 배포 이력을 확인할 수 있습니다.">
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {error && (
        <ErrorAlert
          title="데이터 로드 오류"
          message={error}
          onRetry={fetchCompanies}
        />
      )}

      {loading ? (
        <LoadingSpinner message="회사 데이터를 불러오는 중..." />
      ) : (
        <CompanyTable 
          companies={companies} 
          onCompanyChange={handleCompanyChange} 
        />
      )}
    </AdminLayout>
  );
} 