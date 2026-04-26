import { Router, Request, Response } from 'express';
import { AppDataSource } from '../database/config';
import { DisclaimerAcceptance } from '../entities/DisclaimerAcceptance';
import { verifyToken } from './users';

const router = Router();
const disclaimerRepository = AppDataSource.getRepository(DisclaimerAcceptance);

const DISCLAIMER_TEXT = `
REVERSE ENGINEER SUITE - LEGAL DISCLAIMER

This application is designed for EDUCATIONAL AND DEVELOPMENT PURPOSES ONLY.

By using this application, you acknowledge and agree to the following:

1. AUTHORIZED USE ONLY
   You may only reverse engineer, decompile, or analyze applications that you:
   - Own or have developed
   - Have explicit written permission from the copyright holder to analyze
   - Are analyzing for legitimate educational purposes
   - Are analyzing for authorized security research

2. NO ILLEGAL ACTIVITY
   You agree NOT to use this tool for:
   - Circumventing or bypassing security measures
   - Stealing intellectual property
   - Creating malware or malicious code
   - Violating any laws or regulations
   - Unauthorized access to systems or data

3. LIABILITY DISCLAIMER
   This application is provided "AS IS" without warranty of any kind. The developers and maintainers:
   - Are NOT responsible for any misuse of this tool
   - Are NOT liable for any damages or legal consequences
   - Do NOT endorse any illegal activities
   - Cannot be held responsible for third-party code analysis

4. USER RESPONSIBILITY
   YOU ARE SOLELY RESPONSIBLE for:
   - Ensuring you have legal rights to analyze any code
   - Complying with all applicable laws and regulations
   - Any consequences resulting from your use of this tool
   - Respecting intellectual property rights

5. NO WARRANTY
   The analysis results provided by this tool are provided on a best-effort basis.
   There is NO guarantee of accuracy, completeness, or fitness for any purpose.

6. TERMINATION
   We reserve the right to terminate access to this service for:
   - Suspected illegal activity
   - Terms of service violations
   - Abuse of the platform

By clicking "I Agree", you confirm that you have read, understood, and agree
to be bound by this disclaimer and all applicable laws and regulations.

Last Updated: 2026-04-26
`;

// Accept disclaimer
router.post('/accept', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    // Check if already accepted
    const existing = await disclaimerRepository.findOne({
      where: { userId },
    });

    if (existing) {
      return res.status(200).json({ message: 'Disclaimer already accepted' });
    }

    const acceptance = disclaimerRepository.create({
      userId,
      disclaimerVersion: '1.0',
      ipAddress,
      userAgent,
    });

    await disclaimerRepository.save(acceptance);

    res.status(201).json({
      message: 'Disclaimer accepted',
      acceptedAt: acceptance.acceptedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept disclaimer' });
  }
});

// Get disclaimer text
router.get('/text', (req: Request, res: Response) => {
  res.json({
    text: DISCLAIMER_TEXT,
    version: '1.0',
  });
});

// Check if user has accepted disclaimer
router.get('/status', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const acceptance = await disclaimerRepository.findOne({
      where: { userId },
    });

    res.json({
      accepted: !!acceptance,
      acceptedAt: acceptance?.acceptedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check disclaimer status' });
  }
});

export default router;
