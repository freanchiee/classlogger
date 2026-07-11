// src/types/database-enhanced.ts
// Complete type definitions for enhanced class logging system

export interface ClassLogAttachments {
    auto_detected?: boolean
    features_used?: string[]
    session_type?: string
    detection_timestamp?: string
    duration_minutes?: number
    manual_notes?: {
      class_description?: string | null
      topics_covered?: string | null
      homework_assigned?: string | null
      key_points?: string | null
      notes_last_saved?: string | null
    }
    screenshots?: ScreenshotMetadata[]
    last_screenshot?: ScreenshotMetadata
    total_screenshots?: number
  }
  
  export interface ScreenshotMetadata {
    timestamp: string
    type: 'manual' | 'auto'
    format: string
    size: number
  }
  
  export interface ClassLog {
    id: string
    teacher_id: string
    date: string
    content: string | null
    topics_covered: string[] | null
    homework_assigned: string | null
    attendance_count: number | null
    total_students: number | null
    status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
    attachments: ClassLogAttachments | null
    start_time: string | null
    end_time: string | null
    duration_minutes: number | null
    google_meet_link: string | null
    detected_automatically: boolean | null
    student_name: string | null
    student_email: string | null
    created_at: string
    updated_at: string
  }
  
  export interface ClassFile {
    id: string
    class_log_id: string
    file_name: string
    file_path: string
    file_size: number
    file_type: string
    uploaded_by: string
    uploaded_by_role: string
    description: string | null
    is_homework: boolean
    created_at: string
    uploaded_by_name?: string
  }
  
  export interface ClassStats {
    today: number
    thisWeek: number
    thisMonth: number
    totalHours: number
    autoDetected: number
    liveClasses: number
  }
  
  export interface LiveClassInfo {
    id: string
    student_name: string | null
    start_time: string
    duration_minutes: number
    google_meet_link: string | null
  }
  
  export interface EnhancedClassLog extends ClassLog {
    formattedDuration: string
    isLive: boolean
    liveStatus: 'not_started' | 'live' | 'completed'
    timeDisplay: string
    studentNames: string[]
    totalScreenshots: number
    hasManualNotes: boolean
  }
  
  export interface MyClassesViewProps {
    teacherId: string
  }
  
  export interface ClassCardProps {
    classLog: EnhancedClassLog
    files: ClassFile[]
    isExpanded: boolean
    isUploading: boolean
    onToggleExpand: () => void
    onEditContent: (content: string) => void
    onFileUpload: (files: FileList) => void
    onDeleteFile: (fileId: string) => void
  }
  
  export interface LiveIndicatorProps {
    classLog: ClassLog
    className?: string
  }
  
  export interface StatsCardProps {
    title: string
    value: string | number
    subtitle: string
    icon: React.ComponentType<{ className?: string }>
    className?: string
    isAnimated?: boolean
  }// src/types/database-enhanced.ts
// Complete type definitions for enhanced class logging system

export interface ClassLogAttachments {
  auto_detected?: boolean
  features_used?: string[]
  session_type?: string
  detection_timestamp?: string
  duration_minutes?: number
  manual_notes?: {
    class_description?: string | null
    topics_covered?: string | null
    homework_assigned?: string | null
    key_points?: string | null
    notes_last_saved?: string | null
  }
  screenshots?: ScreenshotMetadata[]
  last_screenshot?: ScreenshotMetadata
  total_screenshots?: number
}

export interface ScreenshotMetadata {
  timestamp: string
  type: 'manual' | 'auto'
  format: string
  size: number
}

export interface ClassLog {
  id: string
  teacher_id: string
  date: string
  content: string | null
  topics_covered: string[] | null
  homework_assigned: string | null
  attendance_count: number | null
  total_students: number | null
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
  attachments: ClassLogAttachments | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  google_meet_link: string | null
  detected_automatically: boolean | null
  student_name: string | null
  student_email: string | null
  student_id: string | null
  credits_deducted?: number | null
  is_paid?: boolean | null
  payment_status?: 'paid' | 'partial' | 'unpaid' | null
  share_token?: string | null
  enrollment_id?: string | null
  created_at: string
  updated_at: string
}

export interface ClassFile {
  id: string
  class_log_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  uploaded_by: string
  uploaded_by_role: string
  description: string | null
  is_homework: boolean
  created_at: string
  uploaded_by_name?: string
}

export interface ClassStats {
  today: number
  thisWeek: number
  thisMonth: number
  totalHours: number
  autoDetected: number
  liveClasses: number
}

export interface LiveClassInfo {
  id: string
  student_name: string | null
  start_time: string
  duration_minutes: number
  google_meet_link: string | null
}

export interface EnhancedClassLog extends ClassLog {
  formattedDuration: string
  isLive: boolean
  liveStatus: 'not_started' | 'live' | 'completed'
  timeDisplay: string
  studentNames: string[]
  totalScreenshots: number
  hasManualNotes: boolean
}

export interface MyClassesViewProps {
  teacherId: string
}

export interface ClassCardProps {
  classLog: EnhancedClassLog
  files: ClassFile[]
  isExpanded: boolean
  isUploading: boolean
  onToggleExpand: () => void
  onEditContent: (content: string) => void
  onFileUpload: (files: FileList) => void
  onDeleteFile: (fileId: string) => void
}

export interface LiveIndicatorProps {
  classLog: ClassLog
  className?: string
}

export interface StatsCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  className?: string
  isAnimated?: boolean
}


