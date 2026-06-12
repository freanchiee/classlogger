// src/hooks/useClassLogs.ts
// Custom hook for managing class logs data with proper error handling

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { 
  enhanceClassLog, 
  calculateStats, 
  getLiveClasses 
} from '@/lib/class-utils'
import type { 
  ClassLog, 
  EnhancedClassLog, 
  ClassFile, 
  ClassStats, 
  LiveClassInfo 
} from '@/types/database-enhanced'

interface UseClassLogsOptions {
  teacherId: string
  selectedDate?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseClassLogsReturn {
  // Data
  classLogs: EnhancedClassLog[]
  classFiles: Record<string, ClassFile[]>
  stats: ClassStats
  liveClasses: LiveClassInfo[]
  
  // State
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  
  // Actions
  refreshData: () => Promise<void>
  updateClassContent: (classId: string, content: string) => Promise<void>
  uploadFiles: (classLogId: string, files: FileList) => Promise<void>
  deleteFile: (fileId: string, filePath: string) => Promise<void>
  
  // Utilities
  getFilesForClass: (classLogId: string) => ClassFile[]
  isClassLive: (classLogId: string) => boolean
}

export function useClassLogs({
  teacherId,
  selectedDate = new Date().toISOString().split('T')[0],
  autoRefresh = true,
  refreshInterval = 30000
}: UseClassLogsOptions): UseClassLogsReturn {
  
  // Uses the shared, session-authenticated Supabase client from @/lib/supabase
  // (createClientComponentClient was unauthenticated → RLS returned 0 rows).

  // State
  const [classLogs, setClassLogs] = useState<EnhancedClassLog[]>([])
  const [classFiles, setClassFiles] = useState<Record<string, ClassFile[]>>({})
  const [stats, setStats] = useState<ClassStats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalHours: 0,
    autoDetected: 0,
    liveClasses: 0
  })
  const [liveClasses, setLiveClasses] = useState<LiveClassInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  // Fetch class files for a specific class log
  const fetchClassFiles = useCallback(async (classLogId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_files')
        .select(`
          *,
          uploaded_by_profile:profiles!uploaded_by(full_name)
        `)
        .eq('class_log_id', classLogId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Files join query failed, falling back to basic query:', error)
        
        const { data: basicData, error: basicError  } = await supabase
          .from('class_files')
          .select('*')
          .eq('class_log_id', classLogId)
          .order('created_at', { ascending: false })

        if (basicError) {
          throw basicError
        }

        setClassFiles(prev => ({
          ...prev,
          [classLogId]: basicData || []
        }))
        return
      }

      const filesWithNames = (data || []).map(file => ({
        ...file,
        uploaded_by_name: file.uploaded_by_profile?.full_name || 'Unknown'
      }))

      setClassFiles(prev => ({
        ...prev,
        [classLogId]: filesWithNames
      }))
    } catch (err) {
      console.error('Error fetching class files:', err)
    }
  }, [])

  // Fetch class logs for selected date
  const fetchClassLogs = useCallback(async () => {
    try {
      setError(null)
      
      const { data, error } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', selectedDate)
        .order('start_time', { ascending: false })

      if (error) {
        throw error
      }

      const rawLogs = (data as ClassLog[]) || []
      const enhancedLogs = rawLogs.map(log => enhanceClassLog(log))
      setClassLogs(enhancedLogs)

      // Fetch files for each class log
      await Promise.all(rawLogs.map(log => fetchClassFiles(log.id)))
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch class logs'
      setError(errorMessage)
      console.error('Error fetching class logs:', err)
    }
  }, [teacherId, selectedDate, fetchClassFiles])

  // Fetch overall stats
  const fetchStats = useCallback(async () => {
    try {
      const { data: allLogs, error } = await supabase
        .from('class_logs')
        .select('*')
        .eq('teacher_id', teacherId)

      if (error) {
        throw error
      }

      const rawLogs = (allLogs as ClassLog[]) || []
      const newStats = calculateStats(rawLogs)
      const currentLiveClasses = getLiveClasses(rawLogs)

      setStats(newStats)
      setLiveClasses(currentLiveClasses)
      
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }, [teacherId])

  // Refresh all data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchClassLogs(), fetchStats()])
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchClassLogs, fetchStats])

  // Update class content
  const updateClassContent = useCallback(async (classId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('class_logs')
        .update({ 
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', classId)

      if (error) {
        throw error
      }
      
      await fetchClassLogs()
      
      toast({
        title: "Success",
        description: "Class content updated successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update content'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [fetchClassLogs, toast])

  // Upload files
  const uploadFiles = useCallback(async (classLogId: string, files: FileList) => {
    if (!files || files.length === 0) return

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 50MB.`)
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `${timestamp}-${file.name}`
        const filePath = `class-files/${teacherId}/${classLogId}/${fileName}`

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('class-files')
          .upload(filePath, file)

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('class-files')
          .getPublicUrl(filePath)

        // Save file record to database
        const { error: dbError } = await supabase
          .from('class_files')
          .insert({
            class_log_id: classLogId,
            file_name: file.name,
            file_path: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: teacherId,
            uploaded_by_role: 'teacher',
            description: null,
            is_homework: false
          })

        if (dbError) {
          throw new Error(`Failed to save ${file.name} record: ${dbError.message}`)
        }

        return { success: true, fileName: file.name }
      })

      await Promise.all(uploadPromises)
      await fetchClassFiles(classLogId)
      
      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [teacherId, fetchClassFiles, toast])

  // Delete file
  const deleteFile = useCallback(async (fileId: string, filePath: string) => {
    try {
      // Extract storage path from full URL
      const storagePathMatch = filePath.match(/\/class-files\/(.+)$/)
      if (storagePathMatch) {
        await supabase.storage
          .from('class-files')
          .remove([storagePathMatch[1]])
      }

      // Delete from database
      const { error } = await supabase
        .from('class_files')
        .delete()
        .eq('id', fileId)

      if (error) {
        throw error
      }

      // Refresh files for the affected class
      const classLogId = Object.keys(classFiles).find(id => 
        classFiles[id].some(file => file.id === fileId)
      )
      
      if (classLogId) {
        await fetchClassFiles(classLogId)
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [classFiles, fetchClassFiles, toast])

  // Utility functions
  const getFilesForClass = useCallback((classLogId: string): ClassFile[] => {
    return classFiles[classLogId] || []
  }, [classFiles])

  const isClassLiveById = useCallback((classLogId: string): boolean => {
    const classLog = classLogs.find(log => log.id === classLogId)
    return classLog?.isLive || false
  }, [classLogs])

  // Initial load
  useEffect(() => {
    if (teacherId) {
      setIsLoading(true)
      Promise.all([fetchClassLogs(), fetchStats()])
        .finally(() => setIsLoading(false))
    }
  }, [teacherId, selectedDate, fetchClassLogs, fetchStats])

  // Realtime pub/sub: instantly reflect class start/end without polling.
  // Subscribes to all changes on this teacher's class_logs rows.
  useEffect(() => {
    if (!teacherId) return

    const channel = supabase
      .channel(`class_logs_teacher_${teacherId}`)
      .on(
        'postgres_changes',
        {
          event: '*',                 // INSERT (class started), UPDATE (ended), DELETE
          schema: 'public',
          table: 'class_logs',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          // Any change → re-pull the day's logs + the headline stats
          fetchClassLogs()
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teacherId, fetchClassLogs, fetchStats])

  // Fallback polling while a class is live (in case realtime drops)
  useEffect(() => {
    if (!autoRefresh || stats.liveClasses === 0) return

    const interval = setInterval(() => {
      fetchClassLogs()
      fetchStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, stats.liveClasses, fetchClassLogs, fetchStats])

  return {
    // Data
    classLogs,
    classFiles,
    stats,
    liveClasses,
    
    // State
    isLoading,
    isRefreshing,
    error,
    
    // Actions
    refreshData,
    updateClassContent,
    uploadFiles,
    deleteFile,
    
    // Utilities
    getFilesForClass,
    isClassLive: isClassLiveById
  }
}