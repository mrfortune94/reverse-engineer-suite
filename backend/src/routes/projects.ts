import { Router, Request, Response } from 'express';
import AWS from 'aws-sdk';
import { AppDataSource } from '../database/config';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { verifyToken } from './users';

const router = Router();
const projectRepository = AppDataSource.getRepository(Project);
const userRepository = AppDataSource.getRepository(User);

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Upload file
router.post('/upload', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check storage quota
    if (user.storageUsed + file.size > user.storageQuota) {
      return res.status(413).json({ error: 'Storage quota exceeded' });
    }

    const fileName = `${userId}/${Date.now()}-${file.originalname}`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'reverse-engineer-suite',
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private' as const,
    };

    // Upload to S3
    const s3Response = await s3.upload(params).promise();

    // Create project record
    const project = projectRepository.create({
      userId,
      name: file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      s3Url: s3Response.Location,
      status: 'analyzing',
    });

    await projectRepository.save(project);

    // Update user storage
    user.storageUsed += file.size;
    await userRepository.save(user);

    res.status(201).json({
      message: 'File uploaded successfully',
      project: {
        id: project.id,
        name: project.name,
        fileName: project.fileName,
        fileSize: project.fileSize,
        status: project.status,
        createdAt: project.createdAt,
      },
    });

    // TODO: Trigger decompilation job in background
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get user's projects
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const projects = await projectRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project details
router.get('/:projectId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;

    const project = await projectRepository.findOne({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Delete project
router.delete('/:projectId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;

    const project = await projectRepository.findOne({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete from S3
    const s3Key = project.s3Url.split('/').slice(-1)[0];
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET || 'reverse-engineer-suite',
      Key: s3Key,
    }).promise();

    // Update user storage
    const user = await userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.storageUsed -= project.fileSize;
      await userRepository.save(user);
    }

    // Delete project record
    await projectRepository.remove(project);

    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Download project
router.get('/:projectId/download', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;

    const project = await projectRepository.findOne({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const s3Key = project.s3Url.split('/').slice(-1)[0];
    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'reverse-engineer-suite',
      Key: s3Key,
    };

    res.attachment(project.fileName);
    s3.getObject(params).createReadStream().pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download project' });
  }
});

export default router;
