export type BusinessRole =
  | 'product_manager'
  | 'tech_lead'
  | 'developer'
  | 'qa_engineer'
  | 'devops'
  | 'none';

export interface Profile {
  id: string;
  full_name: string | null;
  business_role: BusinessRole;
  is_admin: boolean;
  created_at: string;
}
export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  customer: string | null;
  created_by: string;
  status: 'planned' | 'in_progress' | 'completed';
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  tag: string | null;
  github_branch_url: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskFile {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}