export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  githubId?: string;
  tier: 'free' | 'premium';
  storageQuota: number;
  storageUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'uploading' | 'analyzing' | 'completed' | 'failed';
  decompilationResult?: DecompilationResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecompilationResult {
  id: string;
  projectId: string;
  sourceCode: string;
  resources: ResourceFile[];
  manifest?: string;
  metadata: {
    decompiler: string;
    duration: number;
    timestamp: Date;
  };
}

export interface ResourceFile {
  id: string;
  path: string;
  content: string;
  type: 'code' | 'layout' | 'string' | 'drawable' | 'other';
}

export interface DisclaimerAcceptance {
  userId: string;
  acceptedAt: Date;
  ipAddress: string;
}
