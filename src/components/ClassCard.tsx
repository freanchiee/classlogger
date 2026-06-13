// src/components/ClassCard.tsx
// Patched version with class_content integration - keeping all existing functionality

'use client'

import React, { useEffect, useState } from 'react'
import { 
  Clock, 
  Users, 
  BookOpen, 
  Upload, 
  ExternalLink, 
  Edit3,
  Camera,
  Download,
  Trash2,
  CheckCircle,
  FileIcon,
  Image as ImageIcon,
  Save,
  X,
  Plus
} from 'lucide-react'

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

import LiveIndicator from './LiveIndicator'
import { PaymentStatusBadge, PaymentStatusDetail, calculatePaymentStatus } from './PaymentStatusBadge'
import { extractTopics, formatFileSize, getHomeworkAssigned } from '@/lib/class-utils'
import type { ClassCardProps } from '@/types/database-enhanced'

// NEW: Interface for class_content table data
interface ClassContent {
  id: string
  class_log_id: string
  topic_1?: string | null
  topic_2?: string | null
  topic_3?: string | null
  topic_4?: string | null
  topic_5?: string | null
  homework_title?: string | null
  homework_description?: string | null
  homework_due_date?: string | null
  teacher_notes?: string | null
  student_performance?: string | null
  key_points?: string | null
  duration_minutes?: number | null
  participants_count?: number | null
  features_used?: string | null
  created_at: string
  updated_at: string
}

const ClassCard: React.FC<ClassCardProps> = ({
  classLog,
  files,
  isExpanded,
  isUploading,
  onToggleExpand,
  onEditContent,
  onFileUpload,
  onDeleteFile
}) => {
  const [editingContent, setEditingContent] = useState(false)
  const [contentText, setContentText] = useState(classLog.content || '')
  
  // NEW: State for class_content data
  const [classContent, setClassContent] = useState<ClassContent | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [editingStructuredContent, setEditingStructuredContent] = useState(false)
  const [structuredContentEdit, setStructuredContentEdit] = useState<Partial<ClassContent>>({})

  // NEW: Load class_content data on component mount
  useEffect(() => {
    const loadClassContent = async () => {
      try {
        setIsLoadingContent(true)
        const response = await fetch(`/api/class-content/${classLog.id}`)
        
        if (response.ok) {
          const content = await response.json()
          if (content) {
            setClassContent(content)
            setStructuredContentEdit(content)
          }
        } else if (response.status === 404) {
          // No content exists yet - this is normal
          console.log('No structured content found for class:', classLog.id)
        }
      } catch (error) {
        console.error('Failed to load class content:', error)
      } finally {
        setIsLoadingContent(false)
      }
    }

    loadClassContent()
  }, [classLog.id])

  // NEW: Function to save structured content
  const saveStructuredContent = async () => {
    try {
      const response = await fetch(`/api/class-content/${classLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(structuredContentEdit)
      })

      if (response.ok) {
        const updatedContent = await response.json()
        setClassContent(updatedContent)
        setEditingStructuredContent(false)
        console.log('✅ Structured content saved successfully')
      } else {
        console.error('Failed to save structured content')
      }
    } catch (error) {
      console.error('Error saving structured content:', error)
    }
  }

  // NEW: Get structured topics from class_content table
  const getStructuredTopics = (): string[] => {
    if (!classContent) return []
    
    return [
      classContent.topic_1,
      classContent.topic_2,
      classContent.topic_3,
      classContent.topic_4,
      classContent.topic_5
    ].filter(Boolean) as string[]
  }

  // Use structured topics if available, fallback to existing extraction
  const topics = classContent ? getStructuredTopics() : extractTopics(classLog)
  const homework = getHomeworkAssigned(classLog)

  // Add this right after line 50 in ClassCard.tsx (after useState declarations)
  console.log('🔍 ClassCard Debug Data:', {
    classId: classLog.id,
    topics_covered_raw: classLog.topics_covered,
    topics_type: typeof classLog.topics_covered,
    extractedTopics: topics,
    topicsLength: topics.length,
    homework: homework,
    hasClassContent: !!classContent,
    structuredTopics: getStructuredTopics()
  })

  const handleContentSave = () => {
    onEditContent(contentText)
    setEditingContent(false)
  }

  const handleContentCancel = () => {
    setContentText(classLog.content || '')
    setEditingContent(false)
  }

  const handleFileUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif'
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        onFileUpload(target.files)
      }
    }
    input.click()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileIcon className="h-4 w-4" />
  }

  const getStatusBadge = () => {
    if (classLog.isLive) {
      return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
    }
    
    switch (classLog.status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'in_progress':
      case 'ongoing':
        return <Badge variant="secondary">In Progress</Badge>
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle className="flex items-center gap-3">
                  {classLog.student_name || 'Class Session'}
                  <LiveIndicator classLog={classLog} />
                  {getStatusBadge()}
                  {/* Payment Status Badge */}
                  {classLog.status === 'completed' && (
                    <PaymentStatusBadge
                      status={calculatePaymentStatus(
                        classLog.credits_deducted || 0,
                        classLog.is_paid || false,
                        classLog.payment_status || undefined,
                        classLog.duration_minutes || undefined
                      )}
                      creditsDeducted={classLog.credits_deducted || 0}
                      showCredits={true}
                      size="sm"
                    />
                  )}
                  {/* NEW: Indicator for structured content */}
                  {classContent && (
                    <Badge variant="outline" className="text-xs">
                      Enhanced
                    </Badge>
                  )}
                  {/* Award Credits Button */}
                  {classLog.student_email && classLog.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Dispatch a custom event that the parent component can listen for
                        const event = new CustomEvent('award-credits', { 
                          detail: { 
                            studentId: classLog.student_email, // Using email as identifier since student_id is not available
                            studentName: classLog.student_name
                          }
                        });
                        window.dispatchEvent(event);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Award Credits
                    </Button>
                  )}
                  {/* Share summary to WhatsApp */}
                  {classLog.status === 'completed' && classLog.share_token && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-green-700 border-green-300 hover:bg-green-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        const url = `${window.location.origin}/class-summary/${classLog.share_token}`
                        const label = classLog.student_name || 'your child'
                        const text = `Hi! Here's the class summary for ${label}:\n${url}`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
                      }}
                      title="Share class summary on WhatsApp"
                    >
                      📲 Share
                    </Button>
                  )}
                </CardTitle>
              </div>

              <div className="flex items-center space-x-2">
                {classLog.detected_automatically && (
                  <Badge variant="outline">Auto-detected</Badge>
                )}
                {(classLog.totalScreenshots || 0) > 0 && (
                  <Badge variant="outline">
                    <Camera className="h-3 w-3 mr-1" />
                    {classLog.totalScreenshots || 0}
                  </Badge>
                )}
                {classLog.google_meet_link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(classLog.google_meet_link!, '_blank')
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Meet
                  </Button>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {classLog.timeDisplay}
              </span>
              {(classContent?.duration_minutes || classLog.formattedDuration) && (
                <span className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {classContent?.duration_minutes ? 
                    `${classContent.duration_minutes}m` : 
                    classLog.formattedDuration
                  }
                </span>
              )}
              {(classContent?.participants_count || classLog.attendance_count || 0) > 0 && (
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {classContent?.participants_count || classLog.attendance_count} students
                </span>
              )}
            </div>

            {/* Content Preview - Enhanced with structured content */}
            <div className="mt-4">
              {editingContent ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder="Enter class description..."
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleContentSave}>
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleContentCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">
                    {classContent?.teacher_notes || classLog.content || 'No description available'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingContent(true)
                      setContentText(classContent?.teacher_notes || classLog.content || '')
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-6" />
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="topics">Topics ({topics.length})</TabsTrigger>
                <TabsTrigger value="structured">Enhanced</TabsTrigger>
                <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Topics Covered */}
                {topics.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Topics Covered</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {topics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Homework from class_content */}
                {(classContent?.homework_title || classContent?.homework_description || homework) && (
                  <div>
                    <Label className="text-base font-semibold">Homework Assigned</Label>
                    <Card className="mt-2">
                      <CardContent className="p-4">
                        {classContent?.homework_title && (
                          <h4 className="font-medium mb-2">{classContent.homework_title}</h4>
                        )}
                        <p className="text-sm">
                          {classContent?.homework_description || homework}
                        </p>
                        {classContent?.homework_due_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Due: {new Date(classContent.homework_due_date).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Enhanced Teacher Notes */}
                {(classContent?.teacher_notes || classLog.hasManualNotes) && (
                  <div>
                    <Label className="text-base font-semibold">Teacher Notes</Label>
                    <Card className="mt-2">
                      <CardContent className="p-4">
                        <p className="text-sm">
                          {classContent?.teacher_notes || 
                           classLog.attachments?.manual_notes?.class_description || 
                           'No notes available'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Key Points */}
                {classContent?.key_points && (
                  <div>
                    <Label className="text-base font-semibold">Key Points</Label>
                    <Card className="mt-2">
                      <CardContent className="p-4">
                        <p className="text-sm">{classContent.key_points}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="topics" className="space-y-4">
                {topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topics.map((topic, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">{topic}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No topics recorded for this class</p>
                  </div>
                )}
              </TabsContent>

              {/* NEW: Enhanced Structured Content Tab */}
              <TabsContent value="structured" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Structured Class Content</Label>
                  {!editingStructuredContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingStructuredContent(true)
                        setStructuredContentEdit(classContent || {
                          class_log_id: classLog.id,
                          topic_1: '',
                          topic_2: '',
                          topic_3: '',
                          topic_4: '',
                          topic_5: '',
                          homework_title: '',
                          homework_description: '',
                          homework_due_date: '',
                          teacher_notes: '',
                          student_performance: '',
                          key_points: ''
                        })
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>

                {editingStructuredContent ? (
                  <div className="space-y-4">
                    {/* Topics Section */}
                    <div>
                      <Label className="text-sm font-medium">Topics (up to 5)</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <Input
                            key={num}
                            placeholder={`Topic ${num}`}
                            value={(structuredContentEdit as Record<string, string | null | undefined>)[`topic_${num}`] || ''}
                            onChange={(e) => setStructuredContentEdit({
                              ...structuredContentEdit,
                              [`topic_${num}`]: e.target.value
                            })}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Homework Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Homework</Label>
                      <Input
                        placeholder="Homework title"
                        value={structuredContentEdit.homework_title || ''}
                        onChange={(e) => setStructuredContentEdit({
                          ...structuredContentEdit,
                          homework_title: e.target.value
                        })}
                      />
                      <Textarea
                        placeholder="Homework description"
                        value={structuredContentEdit.homework_description || ''}
                        onChange={(e) => setStructuredContentEdit({
                          ...structuredContentEdit,
                          homework_description: e.target.value
                        })}
                        rows={2}
                      />
                      <Input
                        type="date"
                        placeholder="Due date"
                        value={structuredContentEdit.homework_due_date || ''}
                        onChange={(e) => setStructuredContentEdit({
                          ...structuredContentEdit,
                          homework_due_date: e.target.value
                        })}
                      />
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Teacher Notes</Label>
                      <Textarea
                        placeholder="Class description and notes"
                        value={structuredContentEdit.teacher_notes || ''}
                        onChange={(e) => setStructuredContentEdit({
                          ...structuredContentEdit,
                          teacher_notes: e.target.value
                        })}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Key Points</Label>
                        <Textarea
                          placeholder="Important points to remember"
                          value={structuredContentEdit.key_points || ''}
                          onChange={(e) => setStructuredContentEdit({
                            ...structuredContentEdit,
                            key_points: e.target.value
                          })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Student Performance</Label>
                        <Textarea
                          placeholder="Student engagement and performance"
                          value={structuredContentEdit.student_performance || ''}
                          onChange={(e) => setStructuredContentEdit({
                            ...structuredContentEdit,
                            student_performance: e.target.value
                          })}
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={saveStructuredContent}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingStructuredContent(false)
                          setStructuredContentEdit(classContent || {})
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {isLoadingContent ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Loading structured content...</p>
                      </div>
                    ) : classContent ? (
                      <div className="space-y-4">
                        {/* Display structured content */}
                        {getStructuredTopics().length > 0 && (
                          <div>
                            <Label className="text-sm font-medium">Topics Covered</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {getStructuredTopics().map((topic, index) => (
                                <Badge key={index} variant="secondary">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {classContent.teacher_notes && (
                          <div>
                            <Label className="text-sm font-medium">Teacher Notes</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {classContent.teacher_notes}
                            </p>
                          </div>
                        )}

                        {classContent.homework_title && (
                          <div>
                            <Label className="text-sm font-medium">Homework</Label>
                            <div className="mt-1">
                              <h4 className="font-medium">{classContent.homework_title}</h4>
                              {classContent.homework_description && (
                                <p className="text-sm text-muted-foreground">
                                  {classContent.homework_description}
                                </p>
                              )}
                              {classContent.homework_due_date && (
                                <p className="text-xs text-muted-foreground">
                                  Due: {new Date(classContent.homework_due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {classContent.key_points && (
                            <div>
                              <Label className="text-sm font-medium">Key Points</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {classContent.key_points}
                              </p>
                            </div>
                          )}

                          {classContent.student_performance && (
                            <div>
                              <Label className="text-sm font-medium">Student Performance</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {classContent.student_performance}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No structured content available</p>
                        <p className="text-sm">Click &ldquo;Edit&rdquo; to add structured class details</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Class Files</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFileUploadClick}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                </div>

                {files.length > 0 ? (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {files.map((file) => (
                        <Card key={file.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {getFileIcon(file.file_type)}
                                <div>
                                  <p className="font-medium text-sm">{file.file_name}</p>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>{formatFileSize(file.file_size)}</span>
                                    <span>•</span>
                                    <span>by {file.uploaded_by_name || 'Unknown'}</span>
                                    <span>•</span>
                                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                  </div>
                                  {file.is_homework && (
                                    <Badge variant="outline" className="mt-1">
                                      Homework
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(file.file_path, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteFile(file.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm">Click &ldquo;Upload Files&rdquo; to add materials</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Session Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Detection Method:</span>
                        <span className="font-medium">
                          {classLog.detected_automatically ? 'Auto-detected' : 'Manual'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {classContent?.duration_minutes ? 
                            `${classContent.duration_minutes}m` : 
                            (classLog.formattedDuration || 'Ongoing')
                          }
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Screenshots:</span>
                        <span className="font-medium">{classLog.totalScreenshots || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Students:</span>
                        <span className="font-medium">
                          {classContent?.participants_count || 
                           classLog.total_students || 
                           classLog.attendance_count || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Content Type:</span>
                        <span className="font-medium">
                          {classContent ? 'Enhanced' : 'Basic'}
                        </span>
                      </div>
                      {classLog.status === 'completed' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment Status:</span>
                          <PaymentStatusBadge
                            status={calculatePaymentStatus(
                              classLog.credits_deducted || 0,
                              classLog.is_paid || false,
                              classLog.payment_status || undefined,
                              classLog.duration_minutes || undefined
                            )}
                            creditsDeducted={classLog.credits_deducted || 0}
                            showCredits={false}
                            size="sm"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {classLog.student_email && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Student Information</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {classLog.student_name?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{classLog.student_name}</p>
                            <p className="text-xs text-muted-foreground">{classLog.student_email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment Information Card */}
                  {classLog.status === 'completed' && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Payment Information</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <PaymentStatusDetail
                          status={calculatePaymentStatus(
                            classLog.credits_deducted || 0,
                            classLog.is_paid || false,
                            classLog.payment_status || undefined,
                            classLog.duration_minutes || undefined
                          )}
                          creditsDeducted={classLog.credits_deducted || 0}
                          durationMinutes={classLog.duration_minutes || undefined}
                        />
                        {(classLog.credits_deducted ?? 0) > 0 && (
                          <div className="mt-3 pt-3 border-t border-muted text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Credits Deducted:</span>
                              <span className="font-medium">{classLog.credits_deducted || 0}h</span>
                            </div>
                            {classLog.duration_minutes && (
                              <div className="flex justify-between">
                                <span>Class Duration:</span>
                                <span className="font-medium">{(classLog.duration_minutes / 60).toFixed(1)}h</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Features Used */}
                  {(classContent?.features_used || 
                    (classLog.attachments?.features_used && classLog.attachments.features_used.length > 0)) && (
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Features Used During Class</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {classContent?.features_used ? 
                            classContent.features_used.split(',').map((feature, index) => (
                              <Badge key={index} variant="outline">
                                {feature.replace('_', ' ')}
                              </Badge>
                            )) :
                            classLog.attachments?.features_used?.map((feature, index) => (
                              <Badge key={index} variant="outline">
                                {feature}
                              </Badge>
                            ))
                          }
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timing Details */}
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Timing Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p className="font-medium">
                            {new Date(classLog.date).toLocaleDateString()}
                          </p>
                        </div>
                        {classLog.start_time && (
                          <div>
                            <span className="text-muted-foreground">Start Time:</span>
                            <p className="font-medium">
                              {new Date(classLog.start_time).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                        {classLog.end_time && (
                          <div>
                            <span className="text-muted-foreground">End Time:</span>
                            <p className="font-medium">
                              {new Date(classLog.end_time).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <p className="font-medium">
                            {classContent?.duration_minutes ? 
                              `${classContent.duration_minutes}m` : 
                              (classLog.formattedDuration || 'Ongoing')
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced Content Update Info */}
                      {classContent && (
                        <div className="mt-4 pt-4 border-t border-muted">
                          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div>
                              <span>Content Created:</span>
                              <p className="font-medium">
                                {new Date(classContent.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <span>Last Updated:</span>
                              <p className="font-medium">
                                {new Date(classContent.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default ClassCard
