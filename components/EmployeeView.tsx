import React from 'react';
import UserManagementView from './UserManagementView';

interface EmployeeViewProps {
  currentUser: any;
}

/**
 * Employee Management is the employee-facing view of the account directory.
 * The shared data source keeps employee profiles and login accounts in sync,
 * while the QR/ID badge workflow is presented from this module.
 */
const EmployeeView: React.FC<EmployeeViewProps> = ({ currentUser }) => (
  <UserManagementView currentUser={currentUser} mode="employees" />
);

export default EmployeeView;
