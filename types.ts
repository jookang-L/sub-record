export enum GradeLevel {
  GRADE_1 = '1등급',
  GRADE_2 = '2등급',
  GRADE_3 = '3등급',
}

export enum RecordType {
  AUTONOMY = '자율',
  CAREER = '진로',
  CLUB = '동아리',
  BEHAVIOR = '행특',
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64 or Text content
  category: 'report' | 'code' | 'knowledge';
}

export interface GeneratedResult {
  gradeVersion: string;
  summary500?: string;
  summary300?: string;
  summary150?: string;
}

export interface GenerationParams {
  reportFiles: UploadedFile[];
  codeFiles: UploadedFile[];
  draftText: string;
  gradeLevel: GradeLevel;
  customKnowledgeBase?: {
    data: string;
    mimeType: string;
  }[];
  customSubjectName?: string;
  customInstructions?: string;
  recordType?: RecordType;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  result: GeneratedResult;
  summary?: string;
}
